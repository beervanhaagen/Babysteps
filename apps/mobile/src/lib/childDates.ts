import type { ChildDatesProblem } from '@teddysteps/core';

// What O2 and "Mijn kleintje is geboren!" say when a date doesn't fit.
export const PROBLEMS: Record<ChildDatesProblem, string> = {
  'birth-format': 'Schrijf de datum als dd-mm-jjjj.',
  'birth-future': "Deze datum ligt nog in de toekomst. Nog onderweg? Kies dan 'Nog onderweg'.",
  'due-format': 'Schrijf de datum als dd-mm-jjjj.',
  'due-far-from-birth': 'Klopt deze datum? Hij ligt ver van de geboortedatum.',
  'due-past': "Deze datum is al een tijdje geweest. Is je kleintje er al? Kies dan 'Ja, geboren!'.",
  'due-too-far': 'Kies een datum binnen tien maanden.',
};
