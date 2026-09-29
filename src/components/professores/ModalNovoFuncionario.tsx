'use client';

import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  UserCheck, 
  MapPin, 
  Phone, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { Professor, FuncaoEscola } from '@/lib/types';
import { formatarCPF, formatarTelefone, formatarCEP, validarCPF } from '@/lib/validations';
import FuncaoEscolaSelector from './FuncaoEscolaSelector';

interface ModalNovoFuncionarioProps {
  isOpen: boolean;
  onClose: () => void;
  onCadastrar: (funcionario: Omit<Professor, 'id' | 'created_at'>) => void;
}

const formInicial = {
  nome_completo: '',
  cpf: '',
  rg: '',
  rg_data_expedicao: '',
  data_nascimento: '',
  genero: 'NÃO INFORMADO',
  matricula: '',
  vinculo_empregaticio: 'EFETIVO',
  ativo: true,

  // Filiação & Endereço
  filiacao_1: '',
  filiacao_2: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',

  // Contatos & Emergência
  email: '',
  telefone: '',
  celular_whatsapp: '',
  contato_emergencia_nome: '',
  contato_emergencia_parentesco: '',
  telefone_emergencia: '',

  // Campo Específico Obrigatório
  funcao_escola: '' as FuncaoEscola | '',

  observacoes: '',
};

export default function ModalNovoFuncionario({
  isOpen,
  onClose,
  onCadastrar,
}: ModalNovoFuncionarioProps) {
  const [form, setForm] = useState(formInicial);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  if (!isOpen) return null;

  const handleUpperChange = (campo: keyof typeof formInicial, valor: string) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor.toUpperCase(),
    }));
  };

  const handleConsultarCep = async (cepInput: string) => {
    const limpo = cepInput.replace(/\D/g, '');
    if (limpo.length !== 8) {
      setCepFeedback({ tipo: 'erro', mensagem: 'Digite os 8 dígitos do CEP para a busca.' });
      return;
    }

    setBuscandoCep(true);
    setCepFeedback(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepFeedback({ tipo: 'erro', mensagem: 'CEP não encontrado. Preencha o endereço manualmente.' });
      } else {
        setForm((prev) => ({
          ...prev,
          logradouro: (data.logradouro || '').toUpperCase(),
          bairro: (data.bairro || '').toUpperCase(),
          cidade: (data.localidade || '').toUpperCase(),
          uf: (data.uf || '').toUpperCase(),
        }));
        setCepFeedback({ tipo: 'sucesso', mensagem: 'Endereço localizado e preenchido com sucesso!' });
      }
    } catch (err) {
      console.warn('Erro ao consultar ViaCEP:', err);
      setCepFeedback({ tipo: 'erro', mensagem: 'Falha na conexão com busca de CEP. Preencha manualmente.' });
    } finally {
      setBuscandoCep(false);
      setTimeout(() => setCepFeedback(null), 4500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_completo.trim()) {
      alert('O Nome Completo do funcionário é obrigatório.');
      return;
    }

    if (!form.funcao_escola) {
      alert('Por favor, selecione a "Função na Escola" do funcionário nos cards abaixo.');
      return;
    }

    if (form.cpf && !validarCPF(form.cpf)) {
      alert('CPF informado é inválido. Por favor, revise os dígitos.');
      return;
    }

    // Composição do endereço completo para retrocompatibilidade
    const partesEndereco = [
      form.logradouro,
      form.numero ? `Nº ${form.numero}` : '',
      form.complemento,
      form.bairro,
      form.cidade && form.uf ? `${form.cidade} - ${form.uf}` : (form.cidade || form.uf),
      form.cep ? `CEP: ${form.cep}` : '',
    ].filter(Boolean);
    const enderecoCompleto = partesEndereco.join(', ').toUpperCase();

    const matriculaFinal = (
      form.matricula.trim() || `FUNC-${Date.now().toString().slice(-6)}`
    ).toUpperCase();

    onCadastrar({
      tipo_profissional: 'funcionario',
      funcao_escola: form.funcao_escola,
      nome_completo: form.nome_completo.trim().toUpperCase(),
      matricula: matriculaFinal,
      cpf: form.cpf.trim().toUpperCase(),
      rg: form.rg.trim().toUpperCase(),
      rg_data_expedicao: form.rg_data_expedicao || undefined,
      data_nascimento: form.data_nascimento || undefined,
      genero: form.genero || 'NÃO INFORMADO',
      vinculo_empregaticio: form.vinculo_empregaticio || 'EFETIVO',
      ativo: form.ativo !== false,

      // Filiação & Endereço
      filiacao_1: form.filiacao_1.trim().toUpperCase(),
      filiacao_2: form.filiacao_2.trim().toUpperCase(),
      nome_mae: form.filiacao_1.trim().toUpperCase(),
      nome_pai: form.filiacao_2.trim().toUpperCase(),
      cep: form.cep.trim(),
      logradouro: form.logradouro.trim().toUpperCase(),
      numero: form.numero.trim().toUpperCase(),
      complemento: form.complemento.trim().toUpperCase(),
      bairro: form.bairro.trim().toUpperCase(),
      cidade: form.cidade.trim().toUpperCase(),
      uf: form.uf.trim().toUpperCase(),
      endereco_completo: enderecoCompleto,

      // Contatos & Emergência
      email: form.email.trim().toUpperCase(),
      telefone: form.telefone.trim(),
      celular_whatsapp: form.celular_whatsapp.trim() || form.telefone.trim(),
      contato_emergencia_nome: form.contato_emergencia_nome.trim().toUpperCase(),
      contato_emergencia_parentesco: form.contato_emergencia_parentesco.trim().toUpperCase(),
      telefone_emergencia: form.telefone_emergencia.trim(),

      observacoes: form.observacoes.trim().toUpperCase(),
      eh_apoio: false,
      turmas_atribuidas_ids: [],
    });

    setForm(formInicial);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-school-gold-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Cadastrar Novo Funcionário
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ficha funcional de apoio e equipe administrativa da escola
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          
          {/* Seção 1: Identificação Civil e Funcional */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-indigo-600 dark:text-school-gold-400" />
              1. Identificação Civil e Funcional
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nome_completo}
                  onChange={(e) => handleUpperChange('nome_completo', e.target.value)}
                  placeholder="EX: JOSÉ CARLOS DA SILVA"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  CPF
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  RG / Órgão Emissor
                </label>
                <input
                  type="text"
                  value={form.rg}
                  onChange={(e) => handleUpperChange('rg', e.target.value)}
                  placeholder="0.000.000 SDS/PE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Gênero
                </label>
                <select
                  value={form.genero}
                  onChange={(e) => setForm({ ...form, genero: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="NÃO INFORMADO">NÃO INFORMADO</option>
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMININO">FEMININO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Matrícula Funcional
                </label>
                <input
                  type="text"
                  value={form.matricula}
                  onChange={(e) => handleUpperChange('matricula', e.target.value)}
                  placeholder="GERADA AUTOMATICAMENTE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Vínculo Empregatício / Contrato
                </label>
                <select
                  value={form.vinculo_empregaticio}
                  onChange={(e) => setForm({ ...form, vinculo_empregaticio: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="EFETIVO">EFETIVO</option>
                  <option value="CONTRATADO">CONTRATADO</option>
                  <option value="CLT">CLT</option>
                  <option value="TERCEIRIZADO">TERCEIRIZADO</option>
                  <option value="ESTAGIÁRIO">ESTAGIÁRIO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              {/* Toggle Status Ativo/Inativo */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div>
                  <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs block">
                    Status Funcional
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    {form.ativo ? 'Ativo no Quadro' : 'Inativo / Afastado'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.ativo}
                  onClick={() => setForm((prev) => ({ ...prev, ativo: !prev.ativo }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.ativo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.ativo ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Seção 2: Filiação & Endereço Completo com Busca de CEP */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-indigo-600 dark:text-school-gold-400" />
              2. Filiação & Endereço Completo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Filiação 1 (Mãe / Responsável 1)
                </label>
                <input
                  type="text"
                  value={form.filiacao_1}
                  onChange={(e) => handleUpperChange('filiacao_1', e.target.value)}
                  placeholder="NOME COMPLETO DA MÃE / RESPONSÁVEL"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Filiação 2 (Pai / Responsável 2)
                </label>
                <input
                  type="text"
                  value={form.filiacao_2}
                  onChange={(e) => handleUpperChange('filiacao_2', e.target.value)}
                  placeholder="NOME COMPLETO DO PAI / RESPONSÁVEL"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* CEP com Busca Automática */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  CEP
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => {
                      const cepFormatado = formatarCEP(e.target.value);
                      setForm({ ...form, cep: cepFormatado });
                      if (cepFormatado.replace(/\D/g, '').length === 8) {
                        handleConsultarCep(cepFormatado);
                      }
                    }}
                    placeholder="00000-000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleConsultarCep(form.cep)}
                    disabled={buscandoCep}
                    className="absolute right-1.5 p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-school-gold-400 transition-colors"
                    title="Buscar CEP"
                  >
                    {buscandoCep ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Logradouro (Rua, Avenida, etc.)
                </label>
                <input
                  type="text"
                  value={form.logradouro}
                  onChange={(e) => handleUpperChange('logradouro', e.target.value)}
                  placeholder="EX: RUA DAS FLORES"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Número
                </label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={(e) => handleUpperChange('numero', e.target.value)}
                  placeholder="EX: 120"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Complemento
                </label>
                <input
                  type="text"
                  value={form.complemento}
                  onChange={(e) => handleUpperChange('complemento', e.target.value)}
                  placeholder="EX: APTO 201, BLOCO B"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Bairro
                </label>
                <input
                  type="text"
                  value={form.bairro}
                  onChange={(e) => handleUpperChange('bairro', e.target.value)}
                  placeholder="EX: BOA VISTA"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Cidade
                </label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => handleUpperChange('cidade', e.target.value)}
                  placeholder="EX: RECIFE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.uf}
                  onChange={(e) => handleUpperChange('uf', e.target.value)}
                  placeholder="PE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Feedback da Busca de CEP */}
            {cepFeedback && (
              <div className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                cepFeedback.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
              }`}>
                {cepFeedback.tipo === 'sucesso' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{cepFeedback.mensagem}</span>
              </div>
            )}
          </div>

          {/* Seção 3: Contatos & Telefones de Emergência */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-indigo-600 dark:text-school-gold-400" />
              3. Contatos & Telefones de Emergência
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleUpperChange('email', e.target.value)}
                  placeholder="FUNCIONARIO@ESCOLA.EDU.BR"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Telefone Principal
                </label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                  placeholder="(81) 3456-7890"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.celular_whatsapp}
                  onChange={(e) => setForm({ ...form, celular_whatsapp: formatarTelefone(e.target.value) })}
                  placeholder="(81) 98765-4321"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Contato de Emergência (Nome)
                </label>
                <input
                  type="text"
                  value={form.contato_emergencia_nome}
                  onChange={(e) => handleUpperChange('contato_emergencia_nome', e.target.value)}
                  placeholder="EX: MARIA SILVA"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Parentesco
                </label>
                <input
                  type="text"
                  value={form.contato_emergencia_parentesco}
                  onChange={(e) => handleUpperChange('contato_emergencia_parentesco', e.target.value)}
                  placeholder="EX: ESPOSA, FILHO, MÃE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Telefone de Emergência
                </label>
                <input
                  type="text"
                  value={form.telefone_emergencia}
                  onChange={(e) => setForm({ ...form, telefone_emergencia: formatarTelefone(e.target.value) })}
                  placeholder="(81) 99999-1111"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Campo Específico Obrigatório: Função na Escola (SEM DROPDOWN) */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <FuncaoEscolaSelector
              value={form.funcao_escola}
              onChange={(funcao) => setForm((prev) => ({ ...prev, funcao_escola: funcao }))}
              required={true}
            />
          </div>

          {/* Seção 5: Observações Gerais */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
              Observações Gerais / Histórico
            </label>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => handleUpperChange('observacoes', e.target.value)}
              placeholder="OBSERVAÇÕES ADICIONAIS SOBRE O FUNCIONÁRIO..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Ações do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Funcionário</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
