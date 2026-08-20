import type {
  IncidentDetail,
  IncidentStreamEvent,
  TimelineResponse,
} from "../types/incident";

const INCIDENT_EVENT_NAMES = [
  "agency-assigned",
  "agency-status-changed",
  "support-requested",
  "severity-changed",
  "incident-resolved",
  "incident-closed",
] as const;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    let message = "Incident 정보를 불러오지 못했습니다.";

    try {
      const error = (await response.json()) as { message?: string };
      if (error.message) message = error.message;
    } catch {
      // JSON 오류 응답이 아니면 기본 메시지를 사용합니다.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getIncident(incidentId: number): Promise<IncidentDetail> {
  return getJson<IncidentDetail>(`/api/incidents/${incidentId}`);
}

export function getIncidentTimeline(
  incidentId: number,
): Promise<TimelineResponse> {
  return getJson<TimelineResponse>(`/api/incidents/${incidentId}/timeline`);
}

interface IncidentEventHandlers {
  onEvent: (event: IncidentStreamEvent) => void;
  onOpen: () => void;
  onError: () => void;
}

export function connectIncidentEvents(
  incidentId: number,
  handlers: IncidentEventHandlers,
): EventSource {
  const source = new EventSource(`/api/incidents/${incidentId}/events`, {
    withCredentials: true,
  });

  const handleEvent = (message: MessageEvent<string>) => {
    try {
      const event = JSON.parse(message.data) as IncidentStreamEvent;
      handlers.onEvent(event);
    } catch (error) {
      console.warn("알 수 없는 Incident SSE 이벤트를 무시합니다.", error);
    }
  };

  INCIDENT_EVENT_NAMES.forEach((eventName) => {
    source.addEventListener(eventName, handleEvent as EventListener);
  });

  source.onopen = handlers.onOpen;
  source.onerror = handlers.onError;

  return source;
}
