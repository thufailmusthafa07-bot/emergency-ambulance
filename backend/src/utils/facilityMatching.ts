export const facilityKey = (facility: string) => {
  const value = facility.toUpperCase();
  if (value.includes('CARDIAC') || value.includes('HEART')) return 'CARDIAC';
  if (value.includes('PEDIATR')) return 'PEDIATRICS';
  if (value.includes('TRAUMA') || value.includes('CRITICAL')) return 'TRAUMA';
  if (value.includes('NEURO')) return 'NEURO';
  return 'GENERAL';
};

export const hospitalSupportsFacility = (requiredFacility: string, facilities: string[]) => {
  const required = facilityKey(requiredFacility);
  return required === 'GENERAL' || facilities.some((facility) => facilityKey(facility) === required);
};
