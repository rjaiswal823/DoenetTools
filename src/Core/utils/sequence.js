import { findFiniteNumericalValue } from '../utils/math';
import me from 'math-expressions';


export function returnStandardSequenceAttributes() {
  return {
    type: {
      createPrimitiveOfType: "string",
      createStateVariable: "type",
      defaultPrimitiveValue: "number",
      toLowerCase: true,
      validValues: ["number", "math", "letters"]
    },
    from: {
      createComponentOfType: "_componentWithSelectableType",
    },
    to: {
      createComponentOfType: "_componentWithSelectableType",
    },
    step: {
      createComponentOfType: "math",
    },
    length: {
      createComponentOfType: "number",
    },
    exclude: {
      createComponentOfType: "_componentListWithSelectableType",
    }
  }

}

export function returnStandardSequenceStateVariableDefinitions() {
  // creates definitions for sequence state variables:
  // type, specifiedFrom, specifiedTo, specifiedLength, specifiedStep, specifiedExclude,
  // lowercase, validSequence,
  // from, step, length, exclude

  // uses attributes defined above
  // attributes: type
  // attributeComponents: from, to, length, step, exclude


  let stateVariableDefinitions = {};

  stateVariableDefinitions.specifiedFrom = {
    returnDependencies: () => ({
      fromAttr: {
        dependencyType: "attributeComponent",
        attributeName: "from",
        variableNames: ["value"],
      },
    }),
    defaultValue: null,
    hasEssential: true,
    essentialVarName: "from",
    definition: function ({ dependencyValues }) {
      if (dependencyValues.fromAttr === null) {
        return {
          useEssentialOrDefaultValue: { specifiedFrom: true },
        }
      }
      if (dependencyValues.fromAttr.stateValues.value === null) {
        // if have a from child, but its value is null,
        // it means we have an invalid from
        // Can't return null, as that indicates value wasn't specified
        // so return NaN
        return {
          setValue: {
            specifiedFrom: NaN,
          }
        }
      }
      return {
        setValue: {
          specifiedFrom: dependencyValues.fromAttr.stateValues.value,
        }
      }
    },
  };

  stateVariableDefinitions.specifiedTo = {

    returnDependencies: () => ({
      toAttr: {
        dependencyType: "attributeComponent",
        attributeName: "to",
        variableNames: ["value"],
      },
    }),
    defaultValue: null,
    hasEssential: true,
    essentialVarName: "to",
    definition: function ({ dependencyValues }) {
      if (dependencyValues.toAttr === null) {
        return {
          useEssentialOrDefaultValue: {
            specifiedTo: true,
          },
        }
      }
      if (dependencyValues.toAttr.stateValues.value === null) {
        // if have a to child, but its value is null,
        // it means we have an invalid to
        // Can't return null, as that indicates value wasn't specified
        // so return NaN
        return {
          setValue: {
            specifiedTo: NaN,
          }
        }
      }
      return {
        setValue: {
          specifiedTo: dependencyValues.toAttr.stateValues.value,
        }
      }
    },
  };

  stateVariableDefinitions.specifiedLength = {
    returnDependencies: () => ({
      lengthAttr: {
        dependencyType: "attributeComponent",
        attributeName: "length",
        variableNames: ["value"],
      },
    }),
    defaultValue: null,
    hasEssential: true,
    essentialVarName: "length",
    definition: function ({ dependencyValues }) {
      if (dependencyValues.lengthAttr === null) {
        return {
          useEssentialOrDefaultValue: {
            specifiedLength: true
          }
        }
      }
      if (dependencyValues.lengthAttr.stateValues.value === null) {
        // if have a length child, but its value is null,
        // it means we have an invalid length
        // Can't return null, as that indicates value wasn't specified
        // so return NaN
        return {
          setValue: {
            specifiedLength: NaN,
          }
        }
      }
      return { setValue: { specifiedLength: dependencyValues.lengthAttr.stateValues.value } }
    },
  };


  stateVariableDefinitions.specifiedStep = {
    returnDependencies: () => ({
      stepAttr: {
        dependencyType: "attributeComponent",
        attributeName: "step",
        variableNames: ["value"],
      },
      type: {
        dependencyType: "stateVariable",
        variableName: "type",
      },
    }),
    defaultValue: null,
    hasEssential: true,
    essentialVarName: "step",
    definition: function ({ dependencyValues }) {
      if (dependencyValues.stepAttr === null) {
        return {
          useEssentialOrDefaultValue: {
            specifiedStep: true
          }
        }
      }

      let step = dependencyValues.stepAttr.stateValues.value;
      if (step === null) {
        // if have a step child, but its value is null,
        // it means we have an invalid step
        // Can't return null, as that indicates value wasn't specified
        // so return NaN
        return {
          setValue: {
            specifiedStep: NaN,
          }
        }
      }
      return { setValue: { specifiedStep: step } };
    },
  };


  stateVariableDefinitions.specifiedExclude = {
    returnDependencies: () => ({
      excludeAttr: {
        dependencyType: "attributeComponent",
        attributeName: "exclude",
        variableNames: ["values"],
      },
    }),
    defaultValue: [],
    hasEssential: true,
    essentialVarName: "exclude",
    definition: function ({ dependencyValues }) {
      if (dependencyValues.excludeAttr === null) {
        return {
          useEssentialOrDefaultValue: {
            specifiedExclude: true
          }
        }
      }
      return {
        setValue: {
          specifiedExclude:
            dependencyValues.excludeAttr.stateValues.values
        }
      };
    },
  };

  stateVariableDefinitions.lowercase = {
    returnDependencies: () => ({
      specifiedTo: {
        dependencyType: "stateVariable",
        variableName: "specifiedTo",
      },
      specifiedFrom: {
        dependencyType: "stateVariable",
        variableName: "specifiedFrom",
      },
    }),
    definition: function ({ dependencyValues }) {

      let capitalRegex = /^[A-Z]*$/;

      // base whether lowercase or upper case on from, if it exists, else to
      let lowercase = true;
      if (dependencyValues.specifiedFrom !== null) {
        if (capitalRegex.test(dependencyValues.specifiedFrom)) {
          lowercase = false;
        }
      } else if (dependencyValues.specifiedTo !== null) {
        if (capitalRegex.test(dependencyValues.specifiedTo)) {
          lowercase = false;
        }
      }

      return { setValue: { lowercase } };
    },
  };


  stateVariableDefinitions.validSequence = {
    returnDependencies: () => ({
      specifiedLength: {
        dependencyType: "stateVariable",
        variableName: "specifiedLength",
      },
      specifiedStep: {
        dependencyType: "stateVariable",
        variableName: "specifiedStep",
      },
      specifiedFrom: {
        dependencyType: "stateVariable",
        variableName: "specifiedFrom",
      },
      specifiedTo: {
        dependencyType: "stateVariable",
        variableName: "specifiedTo",
      },
      type: {
        dependencyType: "stateVariable",
        variableName: "type",
      },
      lowercase: {
        dependencyType: "stateVariable",
        variableName: "lowercase",
      },
    }),
    definition: function ({ dependencyValues }) {

      let validSequence = true;

      if (dependencyValues.specifiedLength !== null) {
        if (!Number.isInteger(dependencyValues.specifiedLength) || dependencyValues.specifiedLength < 0) {
          console.warn("Invalid length of sequence.  Must be a non-negative integer.")
          validSequence = false;
        }
      }

      if (dependencyValues.specifiedStep !== null) {
        // step must be number if not math
        if (dependencyValues.type !== "math") {
          let numericalStep = findFiniteNumericalValue(dependencyValues.specifiedStep);
          if (!Number.isFinite(numericalStep)) {
            console.warn("Invalid step of sequence.  Must be a number for sequence of type " + dependencyValues.type + ".")
            validSequence = false;
          }
        }
      }

      if (dependencyValues.specifiedFrom !== null) {
        if (dependencyValues.type === "number") {
          let numericalFrom = findFiniteNumericalValue(dependencyValues.specifiedFrom);
          if (!Number.isFinite(numericalFrom)) {
            console.warn("Invalid from of number sequence.  Must be a number")
            validSequence = false;
          }
        } else if (Number.isNaN(dependencyValues.specifiedFrom)) {
          console.warn("Invalid from of sequence")
          validSequence = false;
        }

      }

      if (dependencyValues.specifiedTo !== null) {
        if (dependencyValues.type === "number") {
          let numericalTo = findFiniteNumericalValue(dependencyValues.specifiedTo);
          if (!Number.isFinite(numericalTo)) {
            console.warn("Invalid to of number sequence.  Must be a number")
            validSequence = false;
          }
        } else if (Number.isNaN(dependencyValues.specifiedTo)) {
          console.warn("Invalid to of sequence")
          validSequence = false;
        }
      }

      return { setValue: { validSequence } };
    },
  };

  stateVariableDefinitions.from = {
    additionalStateVariablesDefined: ["step", "length", "exclude"],

    returnDependencies: () => ({
      specifiedFrom: {
        dependencyType: "stateVariable",
        variableName: "specifiedFrom",
      },
      specifiedTo: {
        dependencyType: "stateVariable",
        variableName: "specifiedTo",
      },
      specifiedLength: {
        dependencyType: "stateVariable",
        variableName: "specifiedLength",
      },
      specifiedStep: {
        dependencyType: "stateVariable",
        variableName: "specifiedStep",
      },
      type: {
        dependencyType: "stateVariable",
        variableName: "type",
      },
      specifiedExclude: {
        dependencyType: "stateVariable",
        variableName: "specifiedExclude",
      },
      validSequence: {
        dependencyType: "stateVariable",
        variableName: "validSequence",
      },
    }),
    definition: function ({ dependencyValues }) {

      let from = dependencyValues.specifiedFrom;
      let to = dependencyValues.specifiedTo;
      let step = dependencyValues.specifiedStep;
      let length = dependencyValues.specifiedLength;
      let exclude = [...dependencyValues.specifiedExclude];
      let type = dependencyValues.type;

      if (dependencyValues.type === "math") {
        // make sure to and from are math expressions
        if (to !== null) {
          if (!(to instanceof me.class)) {
            to = me.fromAst(to);
          }
        }
        if (from !== null) {
          if (!(from instanceof me.class)) {
            from = me.fromAst(from);
          }
        }
        if (step !== null) {
          if (!(step instanceof me.class)) {
            step = me.fromAst(step);
          }
        }
      } else {

        // if type is not math, convert step to a number
        if (step !== null) {
          if (step instanceof me.class) {
            step = step.evaluate_to_constant();
          }
        }


        if (dependencyValues.type === "letters") {

          // if from, to, and exclude are strings
          // then convert to numbers
          if (from !== null) {
            from = lettersToNumber(from);
          }
          if (to !== null) {
            to = lettersToNumber(to);
          }
          exclude = exclude.map(lettersToNumber);
        } else if (dependencyValues.type === "number") {
          // make sure to, from, and exclude are numbers
          if (to !== null) {
            if (to instanceof me.class) {
              to = to.evaluate_to_constant();
            } else {
              to = Number(to);
            }
          }
          if (from !== null) {
            if (from instanceof me.class) {
              from = from.evaluate_to_constant();
            } else {
              from = Number(from)
            }
          }
          for (let [index, value] of exclude.entries()) {
            if (value instanceof me.class) {
              exclude[index] = value.evaluate_to_constant();
            } else {
              exclude[index] = Number(value);
            }
          }
        }
      }


      if (dependencyValues.validSequence) {
        let results = calculateSequenceParameters({
          from, to, step, length, type
        });
        results.exclude = exclude;

        return { setValue: results };

      }

      if (!Number.isInteger(length) || length < 0) {
        length = 0;
      }

      return { setValue: { from, step, length, exclude } };
    },
  };

  return stateVariableDefinitions;

}

export function calculateSequenceParameters({ from, to, step, length, type }) {

  // calculate from, length and step from combinatons of from/to/length/step specified

  if (from === null) {
    if (to === null) {
      if (type === "math") {
        from = me.fromAst(1);
      } else {
        from = 1;
      }
      if (step === null) {
        // no from, to, or step
        if (type === "math") {
          step = me.fromAst(1);
        } else {
          step = 1;
        }
        if (length === null) {
          length = 10;
        }
      } else {
        // no from or to, but step
        if (length === null) {
          length = 10;
        }
      }
    } else {
      // no from, but to
      if (step === null) {
        if (type === "math") {
          step = me.fromAst(1);
        } else {
          step = 1;
        }
      }
      if (length === null) {
        if (type === "math") {
          length = Math.floor((to.subtract(1).divide(step).evaluate_to_constant() + 1) * (1 + 1E-14));
        } else {
          length = Math.floor(((to - 1) / step + 1) * (1 + 1E-14))
        }
      }

      // no from, but to
      // defined step and length even if none
      if (type === "math") {
        from = to.subtract(step.multiply(length - 1)).simplify();
      } else {
        from = to - step * (length - 1);
        if (type === "letters") {
          if (from < 1) {
            // adjust length so that have valid letters
            length = Math.floor(((to - 1) / step + 1) * (1 + 1E-14))
            from = to - step * (length - 1);

          }
        }
      }
    }
  } else {
    // from defined
    if (to === null) {
      // no to, but from
      if (step === null) {
        if (type === "math") {
          step = me.fromAst(1);
        } else {
          step = 1;
        }
      }
      if (length === null) {
        length = 10;
      }
    } else {
      // from and to defined
      if (step === null) {
        if (length === null) {
          if (type === "math") {
            step = me.fromAst(1);
            length = Math.floor((to.subtract(from).add(1).evaluate_to_constant()) * (1 + 1E-14));
          } else {
            step = 1;
            length = Math.floor((to - from + 1) * (1 + 1E-14));
          }
        } else {
          if (type === "math") {
            step = to.subtract(from).divide(length - 1);
          } else {
            step = (to - from) / (length - 1);
            // for letters, step must be integer
            if (type === "letters") {
              step = Math.floor(step);
            }
          }
        }
      } else {
        if (length === null) {
          // from, to, and step, no length
          if (type === "math") {
            length = Math.floor(to.subtract(from).divide(step).add(1).evaluate_to_constant() * (1 + 1E-14));
          } else {
            length = Math.floor(((to - from) / step + 1) * (1 + 1E-14));
          }
        } else {
          // from, to, step, and length defined
          throw Error("Can't define from, to, step, and length for sequence");
        }
      }
    }
  }

  if (!Number.isInteger(length) || length < 0) {
    console.warn("Invalid length of sequence.  Must be a non-negative integer.")
    length = 0;
  }

  return {
    from, step, length,
  }
}

export function returnSequenceValues({ from, step, length, exclude, type, lowercase, maxNum }, includeOriginalIndex = false) {
  let sequenceValues = [];
  let nValues = 0;

  for (let ind = 0; ind < length; ind++) {
    let value = from;
    if (ind > 0) {
      if (type === "math") {
        value = value.add(step.multiply(me.fromAst(ind))).expand().simplify();
      } else {
        value += step * ind;
      }
    }

    if (type === "math") {
      if (exclude.some(x => x && x.equals(value))) {
        continue;
      }
    } else if (type === "number") {
      if (exclude.some(x => Math.abs(x - value) <= 1E-14 * Math.max(Math.abs(x), Math.abs(value)))) {
        continue;
      }
    } else {
      if (exclude.includes(value)) {
        continue;
      }
    }

    if (type === "letters") {
      value = numberToLetters(value, lowercase);
    }

    if (includeOriginalIndex) {
      sequenceValues.push({ value, originalIndex: ind });
    } else {
      sequenceValues.push(value);
    }

    nValues++;

    if (nValues === maxNum) {
      break;
    }

  }

  return sequenceValues;
}

export function returnSequenceValueForIndex({ index, from, step, length, exclude, type, lowercase }) {

  // note: if index is excluded or index is out of range, returns null

  if (!(index >= 0 && (length === undefined || index < length))) {
    return null;
  }

  let value = from;
  if (index > 0) {
    if (type === "math") {
      value = value.add(step.multiply(me.fromAst(index))).expand().simplify();
    } else {
      value += step * index;
    }
  }

  if (type === "math") {
    if (exclude.some(x => x && x.equals(value))) {
      return null;
    }
  } else if (type === "number") {
    if (exclude.some(x => Math.abs(x - value) <= 1E-14 * Math.max(Math.abs(x), Math.abs(value)))) {
      return null;
    }
  } else {
    if (exclude.includes(value)) {
      return null;
    }
  }

  if (type === "letters") {
    value = numberToLetters(value, lowercase);
  }

  return value;

}

export function lettersToNumber(letters) {

  try {
    letters = letters.toUpperCase();
  } catch (e) {
    console.warn("Cannot convert " + letters + " to a number");
    return undefined;
  }

  let number = 0,
    len = letters.length,
    pos = len;
  while ((pos -= 1) > -1) {
    let numForLetter = letters.charCodeAt(pos) - 64;
    if (numForLetter < 1 || numForLetter > 26) {
      console.warn("Cannot convert " + letters + " to a number");
      return undefined;
    }
    number += numForLetter * Math.pow(26, len - 1 - pos);
  }
  return number;
}

export function numberToLetters(number, lowercase) {
  number--;
  let offset = 65;
  if (lowercase) {
    offset = 97;
  }
  let letters = "";
  while (true) {
    let nextNum = number % 26;
    letters = String.fromCharCode(offset + nextNum) + letters;
    if (number < 26) {
      break;
    }
    number = Math.floor(number / 26) - 1;
  }
  return letters;
}
