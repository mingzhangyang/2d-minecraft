/** Module-level counter for generating unique integer IDs for animals and dropped items. */
let _nextId = 1;
export const nextId = (): number => _nextId++;
