// src/utils/empty.ts
// Dummy replacement for formdata-polyfill to prevent read-only fetch getter errors in iframe sandboxes

export const FormData = typeof window !== 'undefined' ? window.FormData : class DummyFormData {};
export const formDataToBlob = () => new Blob();
export default FormData;
