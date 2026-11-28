export function getDriveUrl(url: string): string | null {
    try {
        const parsedUrl = new URL(url);

        if (parsedUrl.protocol !== "https:") {
            return null;
        }

        if (
            parsedUrl.hostname !== "drive.google.com" &&
            parsedUrl.hostname !== "docs.google.com"
        ) {
            return null;
        }
        if ( parsedUrl.hostname === "drive.google.com") {
            const match = parsedUrl.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
            
            if (match) {
                const fileId = match[1];
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
            const folderMatch = parsedUrl.pathname.match(
                /^\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:\/|$)/
            );

            if (folderMatch) {
                const folderId = folderMatch[1];
                return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
            }

            const fileId = parsedUrl.searchParams.get("id");

            if (fileId && /^[a-zA-Z0-9_-]+$/.test(fileId)) {
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
        }

        if (parsedUrl.hostname === "docs.google.com") {
            const match = parsedUrl.pathname.match(
                /^\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/
            );
            if (match) {
                const type = match[1];
                const fileId = match[2];

                const mode = type === "presentation" ? "embed" : "preview";

                return `https://docs.google.com/${type}/d/${fileId}/${mode}`;

            }

        } 



        return null;
    } catch {
        
        return null;
    }
}