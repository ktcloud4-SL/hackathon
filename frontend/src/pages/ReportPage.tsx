import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Crosshair,
  ImagePlus,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { ApiError } from "../api/http";
import { analyzeReport, createReport } from "../api/reports";
import { CitizenHeader } from "../components/CitizenHeader";
import { CategoryHintModal } from "../components/CategoryHintModal";
import { AiAnalysisModal } from "../components/AiAnalysisModal";
import { saveReportResult } from "../state/reportResult";
import type {
  Category,
  ReportAnalysisResponse,
  Severity,
} from "../types/report";
import {
  hasUsableRecommendation,
  withMinimumDuration,
} from "../utils/reportAnalysis";

interface Coordinates {
  latitude: number;
  longitude: number;
}

const addressSuggestions = [
  {
    address: "서울특별시 강남구 테헤란로 1",
    detail: "강남역 1번 출구 인근",
    latitude: 37.4981,
    longitude: 127.0276,
  },
  {
    address: "서울특별시 중구 세종대로 110",
    detail: "서울특별시청 인근",
    latitude: 37.5663,
    longitude: 126.9779,
  },
  {
    address: "서울특별시 종로구 종로 1",
    detail: "종각역 인근",
    latitude: 37.5701,
    longitude: 126.9827,
  },
];

export function ReportPage() {
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [recommendedSeverity, setRecommendedSeverity] = useState<Severity>("MEDIUM");
  const [hasRecommendation, setHasRecommendation] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReportAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAddresses = useMemo(() => {
    const normalizedQuery = addressQuery.trim().toLowerCase();
    if (!normalizedQuery) return addressSuggestions;

    return addressSuggestions.filter(
      ({ address: itemAddress, detail }) =>
        itemAddress.toLowerCase().includes(normalizedQuery) ||
        detail.toLowerCase().includes(normalizedQuery),
    );
  }, [addressQuery]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("이 브라우저에서는 현재 위치를 사용할 수 없습니다.");
      return;
    }

    setIsLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setAddress(
          `현재 위치 · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        );
        setIsLocating(false);
      },
      () => {
        setNotice("위치 권한을 확인해 주세요. 주소 검색으로도 위치를 선택할 수 있어요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectAddress = (suggestion: (typeof addressSuggestions)[number]) => {
    setAddress(suggestion.address);
    setCoordinates({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setAddressQuery("");
    setIsAddressOpen(false);
    setNotice(null);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedImage = event.target.files?.[0];
    if (!selectedImage) return;

    if (selectedImage.size > 10 * 1024 * 1024) {
      setNotice("이미지는 10MB 이하만 첨부할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(selectedImage);
    setImagePreview(URL.createObjectURL(selectedImage));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitReport = async () => {
    if (!coordinates) return;
    setIsCategoryModalOpen(false);
    setIsSubmitting(true);
    setNotice(null);

    try {
      const result = await createReport({
        description: description.trim(),
        address,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        image: image ?? undefined,
        categories: selectedCategories,
        severity: recommendedSeverity,
      });
      saveReportResult(result);
      window.location.assign("/report/analysis");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign("/login?next=%2F");
        return;
      }
      setNotice(
        error instanceof Error
          ? error.message
          : "신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setIsSubmitting(false);
    }
  };

  const analyzeBeforeSubmit = async () => {
    setIsCategoryModalOpen(false);
    setSelectedCategories([]);
    setRecommendedSeverity("MEDIUM");
    setHasRecommendation(false);
    setAnalysisResult(null);
    setIsAnalyzing(true);
    setNotice(null);

    try {
      const analysis = await withMinimumDuration(
        analyzeReport({ description: description.trim(), address }),
      );
      const hasCategories = analysis.categories.length > 0;
      setSelectedCategories(analysis.categories);
      setRecommendedSeverity(analysis.severity);
      setHasRecommendation(hasUsableRecommendation(analysis));
      setAnalysisResult(analysis);
      if (!hasCategories || analysis.needsUserConfirmation) {
        setNotice("자동으로 사고 유형을 분류하지 못했습니다. 유형을 직접 선택해 주세요.");
      }
    } catch {
      setNotice("자동 분석을 완료하지 못했습니다. 사고 유형을 직접 선택해 주세요.");
    } finally {
      setIsAnalyzing(false);
      setIsCategoryModalOpen(true);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!description.trim()) {
      setNotice("발생한 상황을 먼저 알려주세요.");
      return;
    }

    if (!address || !coordinates) {
      setNotice("현재 위치 또는 주소 검색으로 사고 위치를 선택해 주세요.");
      return;
    }

    void analyzeBeforeSubmit();
  };

  return (
    <div className="app-shell">
      <CitizenHeader active="report" />

      <main id="top">
        <section className="report-hero" aria-labelledby="report-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-icon"><ShieldCheck size={16} /></span>
              통합 신고 · 공동대응
            </div>
            <h1 id="report-title">
              어디에 신고할지 고민하지 마세요.<br />
              <span>한 번의 신고를 필요한 기관에 연결해요.</span>
            </h1>
            <p>
              담당 기관이나 정확한 사고 유형을 몰라도 괜찮아요. 상황과 위치를
              알려주시면 OneReport가 분석해 필요한 대응기관을 연결합니다.
            </p>
          </div>

          <div className="emergency-callout" role="note">
            <div className="emergency-icon"><AlertTriangle size={21} /></div>
            <div>
              <strong>즉시 생명이 위험한 상황인가요?</strong>
              <span>이 서비스는 실제 긴급기관에 연결되지 않습니다. 112 또는 119에 먼저 전화해 주세요.</span>
            </div>
          </div>
        </section>

        <section className="report-layout" id="report-form">
          <form className="report-form" onSubmit={handleSubmit} noValidate>
            <div className="form-heading">
              <div>
                <span className="step-kicker">신고서 작성</span>
                <h2>무슨 일이 발생했나요?</h2>
              </div>
              <div className="required-note"><span>*</span> 필수 입력</div>
            </div>

            <div className="form-section">
              <label className="field-label" htmlFor="description">
                <span className="field-number">1</span>
                상황 설명 <span className="required">*</span>
              </label>
              <div className="textarea-wrap">
                <textarea
                  id="description"
                  value={description}
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="예: 차량이 전봇대를 들이받았고, 운전자가 차 안에 있습니다. 전선에서 불꽃도 보여요."
                  rows={6}
                />
                <span className="character-count">{description.length} / 500</span>
              </div>
              <p className="field-help">사람이 다쳤는지, 불·연기·가스 냄새가 나는지 함께 적어주세요.</p>
            </div>

            <div className="form-section">
              <label className="field-label">
                <span className="field-number">2</span>
                사고 위치 <span className="required">*</span>
              </label>
              <div className="location-actions">
                <button
                  className="location-button primary-location"
                  type="button"
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                >
                  <Crosshair size={18} />
                  {isLocating ? "현재 위치 확인 중..." : "현재 위치 사용"}
                </button>
                <button
                  className="location-button"
                  type="button"
                  onClick={() => setIsAddressOpen((open) => !open)}
                  aria-expanded={isAddressOpen}
                >
                  <Search size={18} />
                  주소 검색
                </button>
              </div>

              {isAddressOpen && (
                <div className="address-search-panel">
                  <div className="address-search-input">
                    <Search size={18} />
                    <input
                      autoFocus
                      value={addressQuery}
                      onChange={(event) => setAddressQuery(event.target.value)}
                      placeholder="도로명 또는 장소를 입력하세요"
                      aria-label="주소 검색어"
                    />
                  </div>
                  <div className="address-results">
                    {filteredAddresses.length > 0 ? (
                      filteredAddresses.map((suggestion) => (
                        <button
                          key={suggestion.address}
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                        >
                          <MapPin size={17} />
                          <span>
                            <strong>{suggestion.address}</strong>
                            <small>{suggestion.detail}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))
                    ) : (
                      <p>일치하는 예시 주소가 없습니다.</p>
                    )}
                  </div>
                </div>
              )}

              <div className={`selected-address ${address ? "has-address" : ""}`}>
                <span className="address-pin"><MapPin size={18} /></span>
                <div>
                  <small>선택된 위치</small>
                  <strong>{address || "아직 위치를 선택하지 않았어요"}</strong>
                  {coordinates && (
                    <span>
                      위도 {coordinates.latitude.toFixed(5)} · 경도 {coordinates.longitude.toFixed(5)}
                    </span>
                  )}
                </div>
                {address && <span className="address-check"><Check size={16} /></span>}
              </div>
            </div>

            <div className="form-section image-section">
              <label className="field-label">
                <span className="field-number">3</span>
                현장 사진 <span className="optional">선택</span>
              </label>
              <p className="field-help image-help">사진 한 장을 첨부하면 상황을 더 빠르게 파악할 수 있어요.</p>

              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                aria-label="현장 사진 선택"
              />

              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="선택한 현장 사진 미리보기" />
                  <div className="image-preview-info">
                    <span><Camera size={16} /> 사진 1장 선택됨</span>
                    <strong>{image?.name}</strong>
                  </div>
                  <button type="button" onClick={removeImage} aria-label="선택한 사진 삭제">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  className="image-upload"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="upload-icon"><ImagePlus size={25} /></span>
                  <span>
                    <strong>사진 첨부하기</strong>
                    <small>휴대폰 카메라 또는 앨범에서 선택</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )}
            </div>

            {notice && (
              <div className="form-notice" role="status">
                <AlertTriangle size={17} />
                <span>{notice}</span>
              </div>
            )}

            <div className="submit-area">
              <div className="privacy-note">
                <ShieldCheck size={18} />
                입력한 정보는 사고 대응 목적으로만 사용됩니다.
              </div>
              <button className="submit-button" type="submit" disabled={isSubmitting || isAnalyzing}>
                {isAnalyzing ? "신고 내용 분석 중..." : isSubmitting ? "신고 접수 중..." : "신고 내용 분석하기"}
                <ChevronRight size={20} />
              </button>
            </div>
          </form>

          <aside className="location-panel" aria-label="선택한 사고 위치 지도">
            <div className="map-toolbar">
              <div>
                <span>사고 위치</span>
                <strong>{address ? "위치가 선택되었습니다" : "위치를 선택해 주세요"}</strong>
              </div>
              <button type="button" aria-label="현재 위치로 지도 이동" onClick={handleCurrentLocation}>
                <LocateFixed size={19} />
              </button>
            </div>

            <div className={`mock-map ${coordinates ? "is-selected" : ""}`}>
              <span className="road road-one" />
              <span className="road road-two" />
              <span className="road road-three" />
              <span className="block block-one" />
              <span className="block block-two" />
              <span className="block block-three" />
              <div className="map-label label-one">테헤란로</div>
              <div className="map-label label-two">강남대로</div>
              <div className="map-pin-marker">
                <span className="marker-pulse" />
                <span className="marker-icon"><Navigation size={21} fill="currentColor" /></span>
              </div>
              <div className="map-caption">
                <MapPin size={16} />
                {address || "현재 위치 또는 주소로 위치를 지정하세요"}
              </div>
            </div>

            <div className="response-preview">
              <div className="preview-heading">
                <span>신고 접수 후</span>
                <strong>이렇게 진행돼요</strong>
              </div>
              <ol>
                <li className="active">
                  <span>1</span>
                  <div><strong>유형 확인</strong><small>사고 유형을 선택해요</small></div>
                </li>
                <li>
                  <span>2</span>
                  <div><strong>기관 배정</strong><small>필요한 기관을 연결해요</small></div>
                </li>
                <li>
                  <span>3</span>
                  <div><strong>실시간 공유</strong><small>대응 상태를 알려드려요</small></div>
                </li>
              </ol>
            </div>
          </aside>
        </section>
      </main>

      <footer>
        <span>OneReport</span>
        <p>한 번의 신고, 여러 기관의 공동대응</p>
      </footer>

      {isCategoryModalOpen && (
        <CategoryHintModal
          selected={selectedCategories}
          hasRecommendation={hasRecommendation}
          analysis={analysisResult}
          onToggle={(category) => setSelectedCategories((current) =>
            current.includes(category)
              ? current.filter((item) => item !== category)
              : [...current, category]
          )}
          onClose={() => setIsCategoryModalOpen(false)}
          onConfirm={() => {
            if (selectedCategories.length === 0 || isSubmitting) return;
            void submitReport();
          }}
        />
      )}

      {isAnalyzing && <AiAnalysisModal />}
    </div>
  );
}
