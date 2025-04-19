import { useState } from 'react';

// Generic type for any object shape
export type ObjectSchema<T> = {
  properties: {
    [K in keyof T]: {
      type: string;
      description?: string;
      required?: boolean;
      default?: T[K];
    }
  }
}

interface UseObjectProps<T> {
  api: string;
  schema: ObjectSchema<T>;
}

interface UseObjectReturn<T> {
  object: Partial<T>;
  setObject: (value: Partial<T>) => void;
  submit: () => Promise<void>;
  isLoading: boolean;
  errors: Record<keyof T, string | undefined>;
}

export function useObject<T extends object>({ api, schema }: UseObjectProps<T>): UseObjectReturn<T> {
  const [object, setObjectState] = useState<Partial<T>>(() => {
    const defaults: Partial<T> = {};
    
    // Type-safe iteration over schema properties
    (Object.entries(schema.properties) as [keyof T, ObjectSchema<T>['properties'][keyof T]][]).forEach(
      ([key, value]) => {
        if ('default' in value) {
          defaults[key] = value.default;
        }
      }
    );
    
    return defaults;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<keyof T, string | undefined>>({} as Record<keyof T, string | undefined>);

  const validateField = (key: keyof T, value: any): string | undefined => {
    const fieldSchema = schema.properties[key];
    
    if (!value && fieldSchema.required) {
      return `${String(key)} is required`;
    }

    if (value !== undefined) {
      // Type validation
      switch (fieldSchema.type) {
        case 'string':
          if (typeof value !== 'string') return `${String(key)} must be a string`;
          break;
        case 'number':
          if (typeof value !== 'number') return `${String(key)} must be a number`;
          break;
        case 'date':
          if (!(value instanceof Date) && !isNaN(Date.parse(value))) {
            return `${String(key)} must be a valid date`;
          }
          break;
        // Add more type validations as needed
      }
    }

    return undefined;
  };

  const setObject = (value: Partial<T>) => {
    const newErrors: Record<keyof T, string | undefined> = {} as Record<keyof T, string | undefined>;
    
    // Validate each field
    Object.keys(value).forEach((key) => {
      const fieldValue = value[key as keyof T];
      newErrors[key as keyof T] = validateField(key as keyof T, fieldValue);
    });

    setErrors(newErrors);
    setObjectState(value);
  };

  const validateObject = (): boolean => {
    const newErrors: Record<keyof T, string | undefined> = {} as Record<keyof T, string | undefined>;
    let isValid = true;

    // Check all required fields
    Object.keys(schema.properties).forEach((key) => {
      const error = validateField(key as keyof T, object[key as keyof T]);
      if (error) {
        isValid = false;
        newErrors[key as keyof T] = error;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const submit = async () => {
    if (!validateObject()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(object),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit');
      }
      
      // Reset form after successful submission
      setObject({} as Partial<T>);
    } catch (error) {
      console.error('Error submitting:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    object,
    setObject,
    submit,
    isLoading,
    errors,
  };
}