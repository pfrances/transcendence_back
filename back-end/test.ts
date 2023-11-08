function copyProperties<T>(source: any, target: T): T {
  for (const key in target) {
    if (key in source) {
      target[key] = source[key];
    }
  }
  return target;
}

// Exemple d'utilisation
interface MyInterface {
  prop1: string;
  prop2: number;
}

const sourceObject = { prop1: "valeur1", prop2: 42, prop3: "inutile" };

const targetInstance: MyInterface = {} as MyInterface;

const copiedInstance = copyProperties(sourceObject, targetInstance);

console.log(copiedInstance); // { prop1: "valeur1", prop2: 42 }
