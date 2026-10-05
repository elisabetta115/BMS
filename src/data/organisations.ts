// Open edX organisation codes → display names, copied from the live catalogue's
// "Organisation" facet (boostmyskills.eu/courses). An OLX export only carries the
// code (course.xml `org="UPV"`), so the importer uses this to store the
// university name shown on course cards and pages.
export const ORGANISATIONS: Record<string, string> = {
  "3OC": "Three O'Clock",
  CECOLAB: "Collaborative Laboratory towards Circular Economy",
  COSS: "Convergence and Open Sharing System (COSS)",
  CREARA: "CREARA Consultores SL",
  DTU: "Technical University of Denmark",
  EPTA: "EPTA PRIME S.R.L",
  HU: "Halmstad University",
  INCOMA: "International Consulting and Mobility Agency S.R.L.",
  INCOMA_EELI: "Koundouraki - Rodopoulou O.E.",
  LEI: "Lietuvos Energetikos Institutas",
  NUIM: "National University of Ireland Maynooth",
  STUBA: "Slovenska Technicka Univerzita V Bratislave",
  TUC: "Polytechneio Kritis",
  UCOI: "University of Coimbra",
  UGA: "Université Grenoble Alpes",
  UNICAMP: "Università Degli Studi Della Campania Luigi Vanvitelli",
  UNIGE: "Università di Genova",
  UNISS: "Università degli studi di Sassari",
  UNIPAR: "Università degli Studi di Napoli Parthenope",
  UNIPARTHENOPE: "Università degli Studi di Napoli Parthenope",
  UPV: "Universitat Politècnica de València",
  VMU: "Vytauto Didziojo Universitetas",
};

/** Full name for an organisation code; anything that isn't a known code is returned as-is. */
export function organisationName(codeOrName: string): string {
  const v = codeOrName.trim();
  return ORGANISATIONS[v.toUpperCase()] ?? v;
}
