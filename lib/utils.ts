import { HealthRecord, HealthScoreBreakdown, HealthSuggestion, Pet } from '../types';

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(dateStr: string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = new Date(dateStr);

  if (format === 'relative') {
    return formatRelativeDate(date);
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };

  return date.toLocaleDateString('en-US', options);
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay === 0) {
    if (diffHour === 0) {
      if (diffMin === 0) return 'Just now';
      return `${diffMin}m ago`;
    }
    return `${diffHour}h ago`;
  }
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

export function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// ─── Age Calculation ─────────────────────────────────────────────────────────

export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();

  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years === 0) {
    const totalMonths = months < 0 ? months + 12 : months;
    if (totalMonths === 0) return 'Less than a month';
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }

  if (years === 1 && months < 0) {
    const totalMonths = 12 + months;
    return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''}`;
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export function calculateHealthScore(
  pet: Pet,
  records: HealthRecord[]
): HealthScoreBreakdown {
  let score = 100;
  const deductions: { reason: string; points: number }[] = [];

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Check vaccination records
  const vaccinations = records.filter((r) => r.type === 'vaccination');
  if (vaccinations.length === 0) {
    score -= 20;
    deductions.push({ reason: 'No vaccination records', points: 20 });
  } else {
    const latest = vaccinations.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    const daysSince = (now.getTime() - new Date(latest.date).getTime()) / dayMs;
    if (daysSince > 365) {
      score -= 15;
      deductions.push({ reason: 'Vaccination overdue', points: 15 });
    }
  }

  // Check vet visits
  const vetVisits = records.filter((r) => r.type === 'vet_visit');
  if (vetVisits.length === 0) {
    score -= 10;
    deductions.push({ reason: 'No vet visit records', points: 10 });
  } else {
    const latest = vetVisits.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    const daysSince = (now.getTime() - new Date(latest.date).getTime()) / dayMs;
    if (daysSince > 180) {
      score -= 10;
      deductions.push({ reason: 'Vet visit overdue (6+ months)', points: 10 });
    }
  }

  // Check deworming
  const deworming = records.filter((r) => r.type === 'deworming');
  if (deworming.length === 0) {
    score -= 5;
    deductions.push({ reason: 'No deworming records', points: 5 });
  }

  // Check grooming
  const grooming = records.filter((r) => r.type === 'grooming');
  if (pet.type === 'dog' || pet.type === 'cat') {
    if (grooming.length === 0) {
      score -= 5;
      deductions.push({ reason: 'No grooming records', points: 5 });
    }
  }

  // Overdue next due dates
  const overdueRecords = records.filter(
    (r) => r.nextDueDate && new Date(r.nextDueDate) < now
  );
  if (overdueRecords.length > 0) {
    const deductionPoints = Math.min(overdueRecords.length * 5, 20);
    score -= deductionPoints;
    deductions.push({
      reason: `${overdueRecords.length} overdue follow-up(s)`,
      points: deductionPoints,
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: getHealthLabel(score),
    deductions,
    suggestions: generateSuggestions(pet, records, score),
  };
}

function getHealthLabel(score: number): HealthScoreBreakdown['label'] {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function generateSuggestions(
  pet: Pet,
  records: HealthRecord[],
  _score: number
): HealthSuggestion[] {
  const suggestions: HealthSuggestion[] = [];
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const vaccinations = records.filter((r) => r.type === 'vaccination');
  if (vaccinations.length === 0) {
    suggestions.push({
      id: 'vax-1',
      title: 'Schedule a vaccination',
      description: 'Keep your pet protected with up-to-date vaccinations.',
      priority: 'high',
      type: 'vaccination',
    });
  } else {
    const latest = vaccinations.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    if ((now.getTime() - new Date(latest.date).getTime()) / dayMs > 300) {
      suggestions.push({
        id: 'vax-2',
        title: 'Vaccination renewal upcoming',
        description: 'Annual booster shots are due soon.',
        priority: 'high',
        type: 'vaccination',
      });
    }
  }

  const vetVisits = records.filter((r) => r.type === 'vet_visit');
  const latestVetVisit = vetVisits.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  if (!latestVetVisit || (now.getTime() - new Date(latestVetVisit.date).getTime()) / dayMs > 180) {
    suggestions.push({
      id: 'vet-1',
      title: 'Schedule a vet checkup',
      description: 'Regular vet visits help catch issues early.',
      priority: 'medium',
      type: 'vet_visit',
    });
  }

  if (pet.type === 'dog' || pet.type === 'cat') {
    const grooming = records.filter((r) => r.type === 'grooming');
    if (grooming.length === 0) {
      suggestions.push({
        id: 'groom-1',
        title: 'Book a grooming session',
        description: 'Regular grooming keeps your pet healthy and happy.',
        priority: 'low',
        type: 'grooming',
      });
    }
  }

  return suggestions;
}

// ─── Distance ────────────────────────────────────────────────────────────────

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

export function formatPetType(type: string): string {
  return capitalize(type.replace('_', ' '));
}

export function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    vet: 'Veterinary Clinic',
    groomer: 'Grooming Salon',
    pet_shop: 'Pet Shop',
    park: 'Dog Park',
    boarding: 'Pet Boarding',
    other: 'Other',
  };
  return map[type] ?? capitalize(type);
}

export function formatHealthRecordType(type: string): string {
  const map: Record<string, string> = {
    vaccination: 'Vaccination',
    vet_visit: 'Vet Visit',
    grooming: 'Grooming',
    medication: 'Medication',
    weight: 'Weight Check',
    deworming: 'Deworming',
    dental: 'Dental Care',
    surgery: 'Surgery',
    other: 'Other',
  };
  return map[type] ?? capitalize(type);
}

// ─── XP / Level ──────────────────────────────────────────────────────────────

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  return currentLevel * currentLevel * 100;
}

export function xpProgressPercent(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const xpForCurrent = (currentLevel - 1) * (currentLevel - 1) * 100;
  const xpForNext = currentLevel * currentLevel * 100;
  return Math.round(((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100);
}

// ─── Greeting ────────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
