import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (id: string) => `plan-md:${id}`;

export async function saveLocalPlanMarkdown(projectId: string, md: string) {
  await AsyncStorage.setItem(KEY(projectId), md);
}

export async function getLocalPlanMarkdown(projectId: string): Promise<string | null> {
  return AsyncStorage.getItem(KEY(projectId));
}

export function generateLocalPlanMarkdown(opts: {
  title?: string;
  description?: string;
  budget?: string;
  skill_level?: string;
} = {}) {
  const t = opts.title || 'Project';
  const b = opts.budget || '$$';
  const s = opts.skill_level || 'Intermediate';
  const d = opts.description || 'A custom DIY project.';

  return `# ${t}

**Overview**  
${d}

## Materials
- Plywood — 2 sheets
- 2x4 studs — 6
- Wood screws — 1 lb
- Wood glue — 1 bottle

## Tools
- Circular saw
- Drill/driver
- Tape measure
- Square
- Safety glasses

## Cut List
- Side panel: 24" × 18" ×2
- Shelf: 24" × 10" ×3
- Top/bottom: 24" × 12" ×2

## Steps
1. Measure and mark all cuts.
2. Rip panels to width.
3. Assemble the carcass with glue and screws.
4. Add shelves and square the box.
5. Sand and finish.

## Time & Cost
- Time: 6–8 hours
- Cost: ~${b} (skill: ${s})
`;
}
