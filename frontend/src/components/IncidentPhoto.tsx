import { Camera, ExternalLink, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import "./incident-photo.css";

interface IncidentPhotoProps {
  imageUrl: string | null;
  incidentId: number;
  compact?: boolean;
}

export function IncidentPhoto({
  imageUrl,
  incidentId,
  compact = false,
}: IncidentPhotoProps) {
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [imageUrl]);

  return (
    <section
      className={`incident-photo ${compact ? "incident-photo--compact" : ""}`}
      aria-label="현장 사진"
    >
      <div className="incident-photo__heading">
        <span><Camera size={15} />현장 사진</span>
        {imageUrl && !hasLoadError && (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            원본 보기 <ExternalLink size={13} />
          </a>
        )}
      </div>

      {imageUrl && !hasLoadError ? (
        <a
          className="incident-photo__frame"
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Incident #${incidentId} 현장 사진 원본 보기`}
        >
          <img
            src={imageUrl}
            alt={`Incident #${incidentId} 현장 사진`}
            loading="lazy"
            onError={() => setHasLoadError(true)}
          />
          <span>클릭해서 크게 보기</span>
        </a>
      ) : (
        <div className="incident-photo__empty">
          <ImageOff size={22} />
          <span>{hasLoadError ? "사진을 불러오지 못했습니다." : "첨부된 현장 사진이 없습니다."}</span>
          {hasLoadError && <small>사진 주소가 만료됐을 수 있으니 페이지를 새로고침해 주세요.</small>}
        </div>
      )}
    </section>
  );
}
