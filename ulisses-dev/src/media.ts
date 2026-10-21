// Caminho para ficheiros de public/media, respeitando a base do build.
export const media = (file: string) => `${import.meta.env.BASE_URL}media/${file}`
