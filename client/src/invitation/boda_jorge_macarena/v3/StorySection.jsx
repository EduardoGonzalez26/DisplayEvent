import { Drawing, DEFAULT_STORY, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";

function storyParagraphs(story) {
  const text = String(story || "").trim() || DEFAULT_STORY;
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function StorySection({ cfg }) {
  const paragraphs = storyParagraphs(cfg?.story);

  return (
    <div className="mjv3-split">
      <div className="mjv3-split-media">
        <Drawing
          src={V3.historia}
          alt="Macarena y Jorge con sus perros"
          ratio="678 / 1000"
          rotate={-1.3}
        />
      </div>
      <div className="mjv3-split-copy">
        <OrnamentRule />
        <h2 className="mj-display mjv3-story-title">Granada, España</h2>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mj-copy mjv3-story-copy">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
