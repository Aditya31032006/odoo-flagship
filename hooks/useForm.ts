import { useState, ChangeEvent } from "react";

export function useForm<T>(initialValues: T) {
  const [formValues, setFormValues] = useState<T>(initialValues);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  }

  function setFieldValue(name: keyof T, value: any) {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  return { formValues, handleChange, setFieldValue };
}
