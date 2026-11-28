import {getDriveUrl} from "@/lib/drive";
import { ExternalLink } from "lucide-react";

type DriveEmbedProps = {
    url: string;
    previewTitle?: string | null;
    previewImage?: string | null;
};

export function DriveEmbed({ url, previewTitle, previewImage }: DriveEmbedProps) {
    const embedUrl = getDriveUrl(url);

    if (embedUrl) {
        return (
            <div className="flex flex-col gap-3"> 
                <iframe src={embedUrl}
                title={previewTitle || "Document preview"}
                className="w-full h-[500px] border-0 rounded-lg"
                allowFullScreen
            />

            <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary text-sm font-medium self-end"
            >
                <ExternalLink size={18} />
                Open in Google Drive
            </a>
            </div>
        )
    }
    return (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
            {previewImage && (
                <img 
                src={previewImage}
                alt={previewTitle || "Resource preview"}
                className="w-full h-48 object-cover"
                />
            )}

            <div className="p-4">
                <h3 className="text-lg font-semibold text-foreground">
                    {previewTitle || "External resource"}
                </h3>
                 <p className="text-sm text-muted-foreground break-all mt-2">
                    {url}
                 </p>
                <a
                 href={url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-4 py-2 mt-4 font-semibold gap-2"
                >
                    <ExternalLink size={18} />
                    Open
                </a>
            </div>
        </div>
    );
}