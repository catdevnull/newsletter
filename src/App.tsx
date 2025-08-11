import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function getWeekDates() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? 0 : 7));

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

interface Raindrop {
  title: string;
  link: string;
  tags: string[];
  cover?: string;
  created: string;
}

const fetchRaindrops = async (apiKey: string): Promise<Raindrop[]> => {
  const response = await fetch("https://api.raindrop.io/rest/v1/raindrops/0", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const data = await response.json();
  return data.items;
};

function App() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [apiKey, setApiKey] = useState("");

  const {
    data: allRaindrops = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["raindrops", apiKey],
    queryFn: () => fetchRaindrops(apiKey),
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const raindrops = React.useMemo(() => {
    if (!startDate || !endDate || !allRaindrops.length) return allRaindrops;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);

    return allRaindrops.filter((raindrop) => {
      const createdDate = new Date(raindrop.created);
      return createdDate >= startDateObj && createdDate <= endDateObj;
    });
  }, [allRaindrops, startDate, endDate]);

  useEffect(() => {
    const { start, end } = getWeekDates();
    setStartDate(start);
    setEndDate(end);

    const savedApiKey = localStorage.getItem("raindropApiKey");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("raindropApiKey", apiKey);
    }
  }, [apiKey]);

  React.useEffect(() => {
    if (error) {
      console.error("Error fetching raindrops:", error);
      alert(error);
    }
  }, [error]);

  const generateMarkdown = () => {
    const sections: Record<string, string[]> = {
      design: [],
      webdev: [],
      art: [],
      others: [],
    };

    const isTwitterOrX = (url: string) => {
      return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(url);
    };

    const isYouTube = (url: string) => {
      return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
    };

    raindrops.forEach((raindrop: Raindrop) => {
      const { title, link, tags, cover } = raindrop;

      const tagsMarkdown =
        // tags.length > 0
        //   ? `\n  Tags: ${tags.map((tag) => `\`${tag}\``).join(", ")}`
        "";
      const imageMarkdown = cover ? `\n  ![Cover](${cover})` : "";

      let raindropMarkdown: string;

      if (isTwitterOrX(link) || isYouTube(link)) {
        const platform = isTwitterOrX(link) ? "Twitter/X" : "YouTube";
        raindropMarkdown = `<!-- ${platform}: ${title}${
          tags.length > 0 ? ` | Tags: ${tags.join(", ")}` : ""
        }${cover ? ` | Cover: ${cover}` : ""} -->
${link}`;
      } else {
        raindropMarkdown = `- [${title}](${link})${tagsMarkdown}${imageMarkdown}
  ![Screenshot](https://rdl.ink/render/${encodeURIComponent(link)})`;
      }

      const sectionKey =
        tags
          .find(
            (tag) =>
              tag.startsWith("design") ||
              tag.startsWith("webdev") ||
              tag.startsWith("art")
          )
          ?.split("/")[0] || "others";

      if (sections[sectionKey]) {
        sections[sectionKey].push(raindropMarkdown);
      } else {
        sections.others.push(raindropMarkdown);
      }
    });

    const SHOW_AS: Record<string, string> = {
      design: "diseño",
      webdev: "desarrollo web",
      art: "arte",
      others: "otros",
    };

    return Object.entries(sections)
      .map(([section, items]) => {
        if (items.length === 0) return "";
        return `## ${SHOW_AS[section] || section.toLowerCase()}\n\n${items.join(
          "\n\n"
        )}`;
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const setThisWeek = () => {
    const { start, end } = getWeekDates();
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="container">
      <h1>Raindrop Links</h1>
      <div className="form">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Raindrop API Key"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start Date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End Date"
        />
        <button type="button" onClick={setThisWeek}>
          This Week
        </button>
        {isLoading && <div>Loading raindrops...</div>}
      </div>

      {raindrops.length > 0 && (
        <div className="markdown">
          <h2>Raindrop Links in Markdown:</h2>
          <textarea value={generateMarkdown()} readOnly></textarea>
        </div>
      )}
      {raindrops.length > 0 && (
        <div className="raindrops">
          <h2>Raindrop Links:</h2>
          <div className="raindrops-grid">
            {raindrops.map((raindrop, index) => (
              <div key={index} className="raindrop">
                <h3>
                  <a
                    href={raindrop.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {raindrop.title}
                  </a>
                </h3>
                {raindrop.tags.length > 0 && (
                  <div className="tags">
                    {raindrop.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {raindrop.cover && (
                  <img
                    src={raindrop.cover}
                    alt="Cover"
                    className="cover-image"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
