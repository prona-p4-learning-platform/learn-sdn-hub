export type WithId = {
    _id: string;
}

export function not<T extends WithId>(a: readonly T[], b: readonly T[]) {
  return a.filter((value) => b.indexOf(value) === -1);
}

export function intersection<T extends WithId>(a: readonly T[], b: readonly T[]) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function union<T extends WithId>(a: readonly T[], b: readonly T[]) {
  return [...a, ...not(b, a)];
}

export function arraysAreEqualById<T extends WithId>(
  array1: readonly T[],
  array2: readonly T[]
): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  for (let i = 0; i < array1.length; i++) {
    if (array1[i]._id !== array2[i]._id) {
      return false;
    }
  }

  return true;
}