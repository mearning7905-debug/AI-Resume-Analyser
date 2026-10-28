import {Link} from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";

import {parseFeedbackJSON} from "~/lib/utils";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    let validFeedback: Feedback | null = null;
    if (feedback) {
        if (typeof feedback === 'object' && 'overallScore' in feedback) {
            validFeedback = feedback as Feedback;
        } else if (typeof feedback === 'string' && feedback.trim().startsWith('{')) {
            validFeedback = parseFeedbackJSON(feedback);
        }
    }

    return (
        <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    {validFeedback ? (
                        <ScoreCircle score={validFeedback.overallScore} />
                    ) : (
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
                            <span className="text-xs text-gray-400">...</span>
                        </div>
                    )}
                </div>
            </div>
            {resumeUrl && (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                        />
                    </div>
                </div>
                )}
        </Link>
    )
}
export default ResumeCard
