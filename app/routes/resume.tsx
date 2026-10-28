import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import {parseFeedbackJSON, normalizeFeedback} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [resumeData, setResumeData] = useState<any>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    const handleRunAnalysis = async (data: any) => {
        if (!data?.resumePath) return;
        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const feedbackResponse = await ai.feedback(
                data.resumePath,
                prepareInstructions({
                    jobTitle: data.jobTitle || '',
                    jobDescription: data.jobDescription || ''
                })
            );

            if (!feedbackResponse) {
                setIsAnalyzing(false);
                setAnalysisError("Failed to get feedback from AI. Please try again.");
                return;
            }

            let feedbackText = '';
            if (typeof feedbackResponse === 'string') {
                feedbackText = feedbackResponse;
            } else if (feedbackResponse.message?.content) {
                feedbackText = typeof feedbackResponse.message.content === 'string'
                    ? feedbackResponse.message.content
                    : (Array.isArray(feedbackResponse.message.content)
                        ? feedbackResponse.message.content.map((c: any) => typeof c === 'string' ? c : c?.text || '').join('\n')
                        : '');
            } else if ((feedbackResponse as any).text) {
                feedbackText = (feedbackResponse as any).text;
            }

            const parsed = parseFeedbackJSON(feedbackText);
            if (!parsed) {
                setIsAnalyzing(false);
                setAnalysisError("Failed to parse AI response. Please try again.");
                return;
            }

            data.feedback = parsed;
            await kv.set(`resume:${id}`, JSON.stringify(data));
            setFeedback(parsed);
            setIsAnalyzing(false);
        } catch (err) {
            console.error("Analysis error:", err);
            setIsAnalyzing(false);
            setAnalysisError(err instanceof Error ? err.message : "Error analyzing resume");
        }
    };

    useEffect(() => {
        const loadResume = async () => {
            if (!id) return;
            const resume = await kv.get(`resume:${id}`);

            if(!resume) return;

            let data: any;
            try {
                data = JSON.parse(resume);
                setResumeData(data);
            } catch (err) {
                console.error("Failed to parse resume JSON:", err);
                return;
            }

            // Immediately set feedback if available so user sees review instantly
            if (data.feedback) {
                if (typeof data.feedback === 'object' && 'overallScore' in data.feedback) {
                    setFeedback(normalizeFeedback(data.feedback));
                } else if (typeof data.feedback === 'string' && data.feedback.trim().startsWith('{')) {
                    const parsed = parseFeedbackJSON(data.feedback);
                    if (parsed) {
                        setFeedback(parsed);
                    }
                }
            }

            // Safely load PDF blob (don't block feedback rendering)
            if (data.resumePath) {
                fs.read(data.resumePath)
                    .then((resumeBlob) => {
                        if (resumeBlob) {
                            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                            setResumeUrl(URL.createObjectURL(pdfBlob));
                        }
                    })
                    .catch((err) => console.error("Error reading resume PDF:", err));
            }

            // Safely load image blob (don't block feedback rendering)
            if (data.imagePath) {
                fs.read(data.imagePath)
                    .then((imageBlob) => {
                        if (imageBlob) {
                            setImageUrl(URL.createObjectURL(imageBlob));
                        }
                    })
                    .catch((err) => console.error("Error reading resume image:", err));
            }
        };

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                            <img src="/images/resume-scan-2.gif" className="w-[300px]" alt="Scanning resume" />
                            {isAnalyzing ? (
                                <p className="text-lg text-gray-600 font-medium animate-pulse">Analyzing resume with AI...</p>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-gray-600 text-center">
                                        {analysisError ? analysisError : "Review is not available yet."}
                                    </p>
                                    {resumeData?.resumePath && (
                                        <button
                                            type="button"
                                            onClick={() => handleRunAnalysis(resumeData)}
                                            className="primary-button"
                                        >
                                            Generate AI Review Now
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
