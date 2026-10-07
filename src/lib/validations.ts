/**
 * Utilitários de Máscara e Validação para PLUGUE
 * Telefones: Padrão (81) 9xxxx-xxxx ou (XX) 9XXXX-XXXX
 * CPF: Formatação 000.000.000-00 e validação oficial por dígito verificador
 */

/**
 * Aplica máscara de telefone brasileiro com DDD.
 * Suporta tanto celular (11 dígitos): (81) 98765-4321
 * quanto fixo (10 dígitos): (81) 3456-7890
 * Se o usuário digitar, formata progressivamente.
 */
export function formatarTelefone(valor: string): string {
  if (!valor) return '';
  // Remove tudo que não for dígito
  let digitos = valor.replace(/\D/g, '');

  // Limita a no máximo 11 dígitos
  if (digitos.length > 11) {
    digitos = digitos.substring(0, 11);
  }

  // Se estiver vazio
  if (digitos.length === 0) return '';

  // Formatação progressiva
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }
  if (digitos.length <= 6) {
    return `(${digitos.substring(0, 2)}) ${digitos.substring(2)}`;
  }
  if (digitos.length <= 10) {
    // Fixo ou celular digitando: (XX) XXXX-XXXX
    return `(${digitos.substring(0, 2)}) ${digitos.substring(2, 6)}-${digitos.substring(6)}`;
  }
  // 11 dígitos (Celular): (XX) XXXXX-XXXX -> Ex: (81) 9xxxx-xxxx
  return `(${digitos.substring(0, 2)}) ${digitos.substring(2, 7)}-${digitos.substring(7, 11)}`;
}

/**
 * Formata CPF para o padrão 000.000.000-00 progressivamente
 */
export function formatarCPF(valor: string): string {
  if (!valor) return '';
  let digitos = valor.replace(/\D/g, '');

  if (digitos.length > 11) {
    digitos = digitos.substring(0, 11);
  }

  if (digitos.length === 0) return '';
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.substring(0, 3)}.${digitos.substring(3)}`;
  if (digitos.length <= 9) return `${digitos.substring(0, 3)}.${digitos.substring(3, 6)}.${digitos.substring(6)}`;
  return `${digitos.substring(0, 3)}.${digitos.substring(3, 6)}.${digitos.substring(6, 9)}-${digitos.substring(9, 11)}`;
}

/**
 * Constantes para Estudantes sem CPF
 * Valor reservado no sistema escolar para estudantes que ainda não possuem CPF: 111.111.111-11
 */
export const CPF_ESTUDANTE_SEM_DOCUMENTO = '111.111.111-11';
export const CPF_ESTUDANTE_SEM_DOCUMENTO_DIGITOS = '11111111111';

/**
 * Verifica se o CPF de um estudante é considerado 'sem documento' / 'sem CPF'
 * (vazio, nulo, '00000000000' ou '11111111111' / '111.111.111-11')
 */
export function isCpfEstudanteSemDocumento(cpf?: string | null): boolean {
  if (!cpf) return true;
  const digitos = cpf.replace(/\D/g, '');
  return digitos === '' || digitos === CPF_ESTUDANTE_SEM_DOCUMENTO_DIGITOS || digitos === '00000000000';
}

/**
 * Validação oficial do algoritmo de CPF brasileiro (Receita Federal)
 * Retorna true se for válido, false se for inválido.
 * Caso a string esteja vazia, retorna true (para campos opcionais; validar obrigatoriedade separadamente se necessário).
 * 
 * Permite exceção exclusiva para estudantes sem CPF (111.111.111-11) quando options.permitirEstudanteSemCpf for true.
 */
export function validarCPF(cpf: string, options?: { permitirEstudanteSemCpf?: boolean }): boolean {
  if (!cpf || !cpf.trim()) return true; // Se vazio, não valida aqui (caso opcional)

  // Remove caracteres não numéricos
  const digitos = cpf.replace(/\D/g, '');

  // Exceção de Validação para Estudantes sem CPF: 111.111.111-11
  if (options?.permitirEstudanteSemCpf && digitos === CPF_ESTUDANTE_SEM_DOCUMENTO_DIGITOS) {
    return true;
  }

  // CPF precisa ter exatamente 11 dígitos
  if (digitos.length !== 11) return false;

  // Rejeita sequências com todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto === 10 || resto === 11 ? 0 : resto;

  if (digito1 !== parseInt(digitos.charAt(9), 10)) {
    return false;
  }

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto === 10 || resto === 11 ? 0 : resto;

  if (digito2 !== parseInt(digitos.charAt(10), 10)) {
    return false;
  }

  return true;
}

/**
 * Formata CEP no padrão 00000-000 progressivamente
 */
export function formatarCEP(valor: string): string {
  if (!valor) return '';
  const digitos = valor.replace(/\D/g, '').substring(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.substring(0, 5)}-${digitos.substring(5)}`;
}

/**
 * Validação estrita de senha no primeiro acesso / redefinição obrigatória:
 * 1. Comprimento Mínimo: Pelo menos 6 dígitos/caracteres.
 * 2. Proibido usar o próprio CPF: Nem formatado com pontos/traço, nem apenas números.
 * 3. Proibido sequências de 3 números consecutivos ou repetidos:
 *    - Bloquear sequências crescentes/decrescentes de 3 dígitos (ex.: 123, 234, 789, 321, 987)
 *    - Bloquear repetições idênticas de 3 dígitos (ex.: 000, 111, 999)
 */
export function validarNovaSenha(senha: string, cpf: string): { valida: boolean; erro?: string } {
  const cpfLimpo = (cpf || '').replace(/\D/g, '');
  const senhaLimpa = (senha || '').trim();

  if (senhaLimpa.length < 6) {
    return { valida: false, erro: 'A senha deve conter no mínimo 6 caracteres.' };
  }
  if (senhaLimpa === cpfLimpo || senhaLimpa === (cpf || '').trim()) {
    return { valida: false, erro: 'A nova senha não pode ser o seu CPF.' };
  }
  // Checagem de 3 números repetidos (ex: 111, 222)
  if (/(\d)\1\1/.test(senhaLimpa)) {
    return { valida: false, erro: 'A senha não pode conter 3 dígitos repetidos (ex: 111, 222).' };
  }
  // Checagem de 3 números sequenciais crescentes ou decrescentes
  for (let i = 0; i < senhaLimpa.length - 2; i++) {
    const a = parseInt(senhaLimpa[i], 10);
    const b = parseInt(senhaLimpa[i + 1], 10);
    const c = parseInt(senhaLimpa[i + 2], 10);
    if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
      if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
        return { valida: false, erro: 'A senha não pode conter números em sequência (ex: 123, 321).' };
      }
    }
  }
  return { valida: true };
}

