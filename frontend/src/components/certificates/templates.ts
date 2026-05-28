import type { CertificateType } from '../../types/certificates';

export function formatDateAR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatTimeAR(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

export function buildDefaultBodyText(args: {
  type: CertificateType;
  patientFullName: string;
  patientDni: string;
  issuedAt: Date;
  hogarName?: string;
  hogarAddress?: string;
}): string {
  const { type, patientFullName, patientDni, issuedAt, hogarName = '', hogarAddress = '' } = args;
  const FECHA = formatDateAR(issuedAt);
  const HORA = formatTimeAR(issuedAt);

  switch (type) {
    case 'CONTROL_CLINICO':
      return (
`En la fecha se asistió a ${patientFullName}, DNI ${patientDni}, para control clínico de sus patologías de base, presentando trastornos de la movilidad que impiden la deambulación fuera del hogar.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    case 'OBITO':
      return (
`Siendo las ${HORA} hs del ${FECHA}, se constató óbito de ${patientFullName}, DNI ${patientDni}.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    case 'PRESENCIA':
      return (
`Se deja constancia que ${patientFullName}, DNI ${patientDni}, se encuentra en este establecimiento.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    case 'CONSENTIMIENTO':
      const hogarTexto = hogarName ? (hogarAddress ? `${hogarName}, ${hogarAddress}` : hogarName) : 'la residencia';
      return (
`CONSENTIMIENTO INFORMADO PARA RESIDENCIAS DE LARGA ESTADÍA

Yo, ${patientFullName}, DNI ${patientDni}, consiento de manera informada y libre mi ingreso y permanencia en ${hogarTexto}, a partir del ${FECHA}.

He sido informado/a acerca de las condiciones de admisión, el régimen interno, los servicios que se prestan, los costos y las políticas de la institución. Comprendo que puedo solicitar información adicional en cualquier momento y que tengo derecho a revocar este consentimiento.

Este consentimiento es otorgado sin presión alguna y con plena capacidad de decisión.

Firma y Aclaración del residente:

${patientFullName}
DNI: ${patientDni}

Firma y Aclaración del familiar responsable:

Nombre y Apellido: 
DNI: 
Parentesco: `
      );

    default:
      return '';
  }
}
