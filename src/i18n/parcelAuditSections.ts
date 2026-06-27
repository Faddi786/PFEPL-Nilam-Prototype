import type { ParcelRecord } from "../data/mockData";

export const PARCEL_AUDIT_SECTION_LABEL_KEYS: Record<string, string> = {
  "Parcel identification": "parcelSections.identification",
  "Title & locality": "parcelSections.titleLocality",
  "Administrative & revenue": "parcelSections.adminRevenue",
  "Registration & mutation": "parcelSections.registrationMutation",
  "Mutation & workflow": "parcelSections.mutationWorkflow",
  "Owner & classification": "parcelSections.ownerClassification",
  "Land use & soil": "parcelSections.landUseSoil",
  "Survey & area": "parcelSections.surveyArea",
  "Plot dimensions": "parcelSections.plotDimensions",
  "Cadastral & access": "parcelSections.cadastralAccess",
  "Infrastructure": "parcelSections.infrastructure",
  "Variance & quality": "parcelSections.varianceQuality",
  "Data provenance": "parcelSections.dataProvenance",
};

export type ParcelAuditSection = {
  label: string;
  keys: Array<keyof ParcelRecord>;
};
