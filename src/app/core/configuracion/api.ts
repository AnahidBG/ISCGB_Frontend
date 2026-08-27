export const URL_BASE_API = 'http://localhost:5231';
export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  programasMateria: `${URL_BASE_API}/api/ProgramasMateria`,

  pdfPrograma: (idPrograma: number) =>
    `${URL_BASE_API}/api/ProgramasMateria/${idPrograma}/pdf`,
} as const;
