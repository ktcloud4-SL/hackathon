import type { IncidentDetail, IncidentStreamEvent } from "../types/incident";

export function applyIncidentStreamEvent(
  current: IncidentDetail,
  event: IncidentStreamEvent,
): IncidentDetail {
  if (event.incidentId !== current.id) return current;

  let agencies = current.agencies;
  let status = event.data.incidentStatus ?? current.status;
  let severity = event.data.severity ?? current.severity;

  if (event.type === "AGENCY_ASSIGNED") {
    const agencyType = event.data.targetAgencyType ?? event.data.agencyType;
    if (agencyType && !agencies.some((agency) => agency.agencyType === agencyType)) {
      agencies = [
        ...agencies,
        {
          agencyType,
          status: "ASSIGNED",
          assignedAt: event.occurredAt,
          updatedAt: event.occurredAt,
        },
      ];
    }
  }

  if (
    event.type === "AGENCY_STATUS_CHANGED" &&
    event.data.agencyType &&
    event.data.status
  ) {
    agencies = agencies.map((agency) =>
      agency.agencyType === event.data.agencyType
        ? { ...agency, status: event.data.status!, updatedAt: event.occurredAt }
        : agency,
    );
  }

  if (event.type === "INCIDENT_RESOLVED") status = "RESOLVED";
  if (event.type === "INCIDENT_CLOSED") status = "CLOSED";
  if (event.type === "SEVERITY_CHANGED" && event.data.severity) {
    severity = event.data.severity;
  }

  const timeline = event.timelineEvent &&
    !current.timeline.some((item) => item.id === event.timelineEvent!.id)
    ? [...current.timeline, event.timelineEvent]
    : current.timeline;

  return {
    ...current,
    agencies,
    status,
    severity,
    timeline,
    updatedAt: event.occurredAt,
    resolvedAt: event.type === "INCIDENT_RESOLVED" ? event.occurredAt : current.resolvedAt,
    closedAt: event.type === "INCIDENT_CLOSED" ? event.occurredAt : current.closedAt,
  };
}
