// Author: Alan Yu

type LinkPreview = {
  title: string | null;
  image: string | null;
};

export async function getPreview(url: string): Promise<LinkPreview> {
  // Pass the shared link to Microlink as a query parameter.
  const endpoint = new URL("https://api.microlink.io/");
  endpoint.searchParams.set("url", url);

  try {
    // Stop waiting after four seconds.
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });

    if (response.ok) {
      const result = await response.json();

      if (result?.status === "success") {
        // Microlink stores the thumbnail URL inside the image object.
        const title = result.data?.title;
        const image = result.data?.image?.url;

        return {
          title: typeof title === "string" ? title : null,
          image: typeof image === "string" ? image : null,
        };
      }
    }
  } catch {
    console.log("Microlink request failed or timed out.");
  }

  return { title: null, image: null };
}
