'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  UserRole, 
  EscolaConfig, 
  Turma, 
  Estudante, 
  Professor, 
  FaltaProfessor, 
  EventoEscolar,
  DocumentoEstudante,
  ActivityLog,
  ActivityLogActionType,
  ActivityLogDetails,
  EstudanteAfetadoLog,
  SystemUser,
  AllowedModule,
  SolicitacaoRelatorio,
  RelatorioProfessor,
  RelatorioConsolidado,
  NotificacaoAdmin,
  ObservacaoAluno,
  ObservacaoAuditoria,
  DocumentoEstudanteDrive,
  AtestadoProfessor,
  ReposicaoAula,
  StatusReposicaoAula,
  TipoObservacaoAluno,
  TipoDocumentoDrive
} from '@/lib/types';
import { 
  initialEscolaConfig, 
  initialTurmas, 
  initialEstudantes, 
  initialProfessores, 
  initialFaltasProfessores, 
  initialEventos,
  initialActivityLogs,
  initialUsers,
  initialSolicitacoesRelatorio,
  initialRelatoriosProfessores,
  initialRelatoriosConsolidados,
  initialNotificacoesAdmin,
  initialObservacoesAluno,
  initialDocumentosEstudanteDrive,
  initialAtestadosProfessor,
  initialReposicoesAulas
} from '@/lib/mock-data';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  escolaConfig: EscolaConfig;
  updateEscolaConfig: (newConfig: Partial<EscolaConfig>) => void;

  // Sidebar Retrátil
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Autenticação & Sessão
  isAuthenticated: boolean;
  isInitialized: boolean;
  logout: () => Promise<void>;
  authenticatedUser: SystemUser | null;
  setAuthenticatedUser: (user: SystemUser | null) => void;
  isAdminSession: boolean;

  // Gestão de Usuários & RBAC
  users: SystemUser[];
  currentUser: SystemUser;
  setCurrentUser: (user: SystemUser) => void;
  addUser: (userData: { name: string; email?: string; cpf: string; role: UserRole; allowed_modules?: AllowedModule[]; is_active?: boolean }) => void;
  updateUser: (id: string, updates: Partial<SystemUser>) => void;
  resetUserPassword: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => void;
  deleteUser: (id: string) => void;
  
  // Dados principais
  turmas: Turma[];
  estudantes: Estudante[];
  professores: Professor[];
  faltasProfessores: FaltaProfessor[];
  eventos: EventoEscolar[];
  activityLogs: ActivityLog[];

  // 1. Relatórios Pedagógicos Colaborativos com IA
  solicitacoesRelatorio: SolicitacaoRelatorio[];
  relatoriosProfessores: RelatorioProfessor[];
  relatoriosConsolidados: RelatorioConsolidado[];
  notificacoesAdmin: NotificacaoAdmin[];
  addSolicitacaoRelatorio: (alunoId: string, adminId?: string, professoresIdsParam?: string[], obs?: string) => string;
  updateSolicitacaoRelatorio?: (id: string, updates: any) => void;
  salvarRascunhoProfessor: (relatorioId: string, rascunho: string) => void;
  updateRelatorioProfessor: (relatorioId: string, updates: Partial<RelatorioProfessor>) => void;
  deleteRelatorioProfessor: (relatorioId: string) => void;
  polirRelatorioComIA: (relatorioId: string, rascunho: string, dadosExtras?: { estudante?: Estudante; turma?: Turma }) => Promise<string>;
  enviarRelatorioProfessor: (relatorioId: string, textoFinal: string) => Promise<void>;
  marcarNotificacaoLida: (notificacaoId: string) => void;
  marcarNotificacaoComoLida: (notificacaoId: string) => void;
  marcarTodasNotificacoesLidas: () => void;
  consolidarRelatorioComIA: (solicitacaoId: string, observacoesSecretaria?: string) => Promise<string>;
  salvarRelatorioConsolidado: (solicitacaoId: string, conteudoFinal: string, observacoesSecretaria?: string) => void;
  excluirSolicitacaoRelatorio: (solicitacaoId: string) => void;

  // 6. Observações Contínuas do Estudante (Ficha do Aluno) & Auditoria
  observacoesAluno: ObservacaoAluno[];
  observacoesAuditoria: ObservacaoAuditoria[];
  addObservacaoAluno: (alunoIdOrPayload: any, tipo?: any, texto?: any, cargo?: any, textoReal?: any, categoriaReal?: any) => Promise<ObservacaoAluno>;
  updateObservacaoAluno: (obsId: string, novoTexto: string) => Promise<void>;
  deleteObservacaoAluno: (obsId: string) => Promise<void>;

  // 7. Repositório Google Drive (Ficha do Estudante)
  documentosEstudanteDrive: DocumentoEstudanteDrive[];
  addDocumentoEstudanteDrive: (doc: DocumentoEstudanteDrive) => void;
  deleteDocumentoEstudanteDrive: (id: string, fileId?: string, nomeArquivo?: string, estudanteId?: string) => Promise<void>;

  // 8. Gestão de Atestados dos Professores
  atestadosProfessor: AtestadoProfessor[];
  addAtestadoProfessor: (atestado: Omit<AtestadoProfessor, 'id' | 'data_upload' | 'permite_exclusao'>) => void;
  deleteAtestadoProfessor: (id: string) => void;
  aprovarAtestadoProfessor: (id: string, aprovar?: boolean) => void;

  // 8.1 Lógica de Débito & Reposição de Aulas (Regra dos 30 Dias)
  reposicoesAulas: ReposicaoAula[];
  registrarReposicaoAula: (reposicaoId: string, dados: { data_execucao: string; horario: string; conteudo: string }) => void;
  homologarReposicaoAula: (reposicaoId: string, homologarOuStatus?: boolean | string) => void;
  deleteReposicaoAula: (id: string) => void;
  addFaltaComReposicao: (dados: { professorId: string; professorNome: string; dataFalta: string; aulasFaltadas: number; justificativa: string; turmaId?: string }) => void;

  // Ações Estudantes
  addEstudante: (estudante: Omit<Estudante, 'id' | 'created_at' | 'documentos'>) => void;
  updateEstudante: (id: string, updates: Partial<Estudante>) => void;
  deleteEstudante: (id: string) => void;
  addDocumentoToEstudante: (estudanteId: string, doc: Omit<DocumentoEstudante, 'id' | 'created_at' | 'estudante_id'>) => void;

  // Ações Turmas & Controle de Status / Migração
  addTurma: (turma: Omit<Turma, 'id' | 'created_at' | 'grade_horaria'>) => void;
  updateTurma: (id: string, updates: Partial<Turma>) => void;
  toggleStatusTurma: (turmaId: string, novaAtiva: boolean) => Promise<void>;
  migrarEstudantes: (estudantesIds: string[], turmaOrigemId: string, turmaDestinoId: string) => Promise<void>;

  // Ações Auditoria
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'created_at'>) => Promise<ActivityLog>;
  refreshActivityLogs: () => Promise<void>;

  // Ações Professores & Faltas
  addProfessor: (prof: Omit<Professor, 'id' | 'created_at'>) => void;
  updateProfessor: (id: string, updates: Partial<Professor>) => void;
  toggleProfessorApoio: (id: string) => void;
  addFaltaProfessor: (falta: Omit<FaltaProfessor, 'id' | 'created_at' | 'homologado'>) => void;
  toggleHomologarFalta: (id: string) => void;

  // Ações Eventos
  addEvento: (evento: Omit<EventoEscolar, 'id' | 'created_at'>) => void;
  deleteEvento: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [role, setRoleState] = useState<UserRole>('admin');
  const [escolaConfig, setEscolaConfigState] = useState<EscolaConfig>(initialEscolaConfig);
  
  const [turmas, setTurmas] = useState<Turma[]>(initialTurmas);
  const [estudantes, setEstudantes] = useState<Estudante[]>(initialEstudantes);
  const [professores, setProfessores] = useState<Professor[]>(initialProfessores);
  const [faltasProfessores, setFaltasProfessores] = useState<FaltaProfessor[]>(initialFaltasProfessores);
  const [eventos, setEventos] = useState<EventoEscolar[]>(initialEventos);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);

  // 1. Relatórios Pedagógicos Colaborativos com IA
  const [solicitacoesRelatorio, setSolicitacoesRelatorio] = useState<SolicitacaoRelatorio[]>(initialSolicitacoesRelatorio);
  const [relatoriosProfessores, setRelatoriosProfessores] = useState<RelatorioProfessor[]>(initialRelatoriosProfessores);
  const [relatoriosConsolidados, setRelatoriosConsolidados] = useState<RelatorioConsolidado[]>(initialRelatoriosConsolidados);
  const [notificacoesAdmin, setNotificacoesAdmin] = useState<NotificacaoAdmin[]>(initialNotificacoesAdmin);

  // 6. Observações Contínuas do Estudante & Auditoria
  const [observacoesAluno, setObservacoesAluno] = useState<ObservacaoAluno[]>(initialObservacoesAluno);
  const [observacoesAuditoria, setObservacoesAuditoria] = useState<ObservacaoAuditoria[]>([]);

  // 7. Documentos Google Drive
  const [documentosEstudanteDrive, setDocumentosEstudanteDrive] = useState<DocumentoEstudanteDrive[]>(initialDocumentosEstudanteDrive);

  // 8. Gestão de Atestados dos Professores
  const [atestadosProfessor, setAtestadosProfessor] = useState<AtestadoProfessor[]>(initialAtestadosProfessor);

  // 8.1 Débito & Reposição de Aulas (Regra dos 30 Dias)
  const [reposicoesAulas, setReposicoesAulas] = useState<ReposicaoAula[]>(initialReposicoesAulas);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [currentUser, setCurrentUserState] = useState<SystemUser>(initialUsers[0]);
  const [authenticatedUser, setAuthenticatedUserState] = useState<SystemUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // O administrador possui permissão total de alternância. O professor logado não pode alternar para outro perfil.
  const isAdminSession = authenticatedUser ? authenticatedUser.role === 'admin' : (role === 'admin');

  const setAuthenticatedUser = (user: SystemUser | null) => {
    setAuthenticatedUserState(user);
    if (user) {
      try {
        sessionStorage.setItem('plugue_auth_user', JSON.stringify(user));
      } catch {}
    } else {
      try {
        sessionStorage.removeItem('plugue_auth_user');
      } catch {}
    }
  };

  // Inicialização com LocalStorage
  useEffect(() => {
    try {
      // Sidebar Retrátil
      const savedCollapsed = localStorage.getItem('sidebar_collapsed');
      if (savedCollapsed !== null) {
        setSidebarCollapsedState(savedCollapsed === 'true');
      }

      // Usuários
      const savedUsers = localStorage.getItem('school_os_users');
      let loadedUsers = initialUsers.filter((u: SystemUser) => !['user-prof-1', 'user-prof-2', 'user-prof-3'].includes(u.id));
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          const validModules: AllowedModule[] = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
          loadedUsers = parsed
            .filter((u: SystemUser) => !['user-prof-1', 'user-prof-2', 'user-prof-3'].includes(u.id))
            .map((u: SystemUser) => {
            const currentMods = u.allowed_modules || [];
            // Remove módulos obsoletos (ATTENDANCE, GRADES, LESSONS)
            let cleanMods = currentMods.filter((m: any) => validModules.includes(m));
            if (!cleanMods.includes('PROFILE')) cleanMods.unshift('PROFILE');
            // Se o professor ficou sem módulos novos (vindo de dados legados), inicializar com os padrões ativos
            if (u.role === 'professor' && !cleanMods.includes('FOTOGRAMA') && !cleanMods.includes('CALENDARIO') && cleanMods.length <= 1) {
              cleanMods = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
            }
            if (u.role === 'admin') {
              cleanMods = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
            }
            const mustChange = localStorage.getItem(`plugue_pwd_changed_${u.id}`) === 'true'
              ? false
              : (Number((u as any).must_change_password) === 1 || u.must_change_password === true || (u as any).must_change_password === '1');
            return {
              ...u,
              must_change_password: mustChange,
              allowed_modules: cleanMods,
            };
          });
          setUsers(loadedUsers);
          localStorage.setItem('school_os_users', JSON.stringify(loadedUsers));
        } catch (e) {
          console.error('Falha ao ler school_os_users:', e);
        }
      }

      // -------------------------------------------------------------
      // Autenticação & Sessão:
      // Regra: "Toda vez que iniciar o sistema tem que solicitar o login"
      // Verifica se existe sessão ativa em sessionStorage
      // -------------------------------------------------------------
      const isSessionActive = sessionStorage.getItem('plugue_session_active');
      const sessionUserJson = sessionStorage.getItem('plugue_session_user');
      const authUserJson = sessionStorage.getItem('plugue_auth_user');

      if (authUserJson) {
        try {
          const parsedAuth = JSON.parse(authUserJson);
          if (parsedAuth) {
            parsedAuth.must_change_password =
              (Number(parsedAuth.must_change_password) === 1 || parsedAuth.must_change_password === true || parsedAuth.must_change_password === '1') &&
              localStorage.getItem(`plugue_pwd_changed_${parsedAuth.id}`) !== 'true';
          }
          setAuthenticatedUserState(parsedAuth);
        } catch {}
      }

      if ((isSessionActive === 'true' || authUserJson) && (sessionUserJson || authUserJson)) {
        try {
          const parsedUser = JSON.parse(sessionUserJson || authUserJson!);
          if (parsedUser) {
            parsedUser.must_change_password =
              (Number(parsedUser.must_change_password) === 1 || parsedUser.must_change_password === true || parsedUser.must_change_password === '1') &&
              localStorage.getItem(`plugue_pwd_changed_${parsedUser.id}`) !== 'true';
          }
          setCurrentUserState(parsedUser);
          setRoleState(parsedUser.role);
          if (!authUserJson) {
            setAuthenticatedUserState(parsedUser);
          }
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        // Nenhuma sessão ativa no momento da inicialização -> exige login
        setIsAuthenticated(false);
      }

      // Tema
      const savedTheme = localStorage.getItem('school_os_theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      setThemeState(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }

      // Perfil
      const savedRole = localStorage.getItem('school_os_role') as UserRole | null;
      if (savedRole && (savedRole === 'admin' || savedRole === 'professor')) {
        setRoleState(savedRole);
      }

      // Config Escola
      const savedConfig = localStorage.getItem('school_os_config');
      if (savedConfig) {
        setEscolaConfigState(JSON.parse(savedConfig));
      }

      // Estudantes persistidos (com validação de integridade pós-migração)
      const savedEstudantes = localStorage.getItem('school_os_estudantes');
      if (savedEstudantes) {
        try {
          const parsedEst: Estudante[] = JSON.parse(savedEstudantes);
          const hasLegacyDummy = parsedEst.some(e => ['est-1', 'est-2', 'est-3', 'est-4', 'est-5'].includes(e.id));
          const allLaudadosCorrupted = parsedEst.length > 50 && parsedEst.filter(e => Boolean(e.possui_laudo)).length > 50;
          if (hasLegacyDummy || parsedEst.length < 50 || allLaudadosCorrupted) {
            setEstudantes(initialEstudantes);
            localStorage.setItem('school_os_estudantes', JSON.stringify(initialEstudantes));
          } else {
            // Garante que estudantes no cache local recuperem o turma_id pelo turma_nome se tiver ocorrido desvinculação prévia
            const turmaMapByName = new Map(initialTurmas.map(t => [t.nome?.trim(), t.id]));
            const sanitizedEst = parsedEst.map(e => {
              if ((!e.turma_id || String(e.turma_id).trim() === '') && e.turma_nome && turmaMapByName.has(String(e.turma_nome).trim())) {
                return { ...e, turma_id: turmaMapByName.get(String(e.turma_nome).trim())! };
              }
              return e;
            });
            setEstudantes(sanitizedEst);
          }
        } catch {
          setEstudantes(initialEstudantes);
        }
      } else {
        setEstudantes(initialEstudantes);
      }

      // Turmas persistidas
      const savedTurmas = localStorage.getItem('school_os_turmas');
      if (savedTurmas) {
        try {
          const parsedTurmas: Turma[] = JSON.parse(savedTurmas);
          const hasLegacyTurmas = parsedTurmas.some(t => t.id === 'turma-1' && t.nome.includes('Ensino Médio'));
          if (hasLegacyTurmas || parsedTurmas.length < 10) {
            setTurmas(initialTurmas);
            localStorage.setItem('school_os_turmas', JSON.stringify(initialTurmas));
          } else {
            const sanitizedTurmas = parsedTurmas.map((t) => ({
              ...t,
              professores_ids: t.professores_ids || (t.professor_regente_id ? [t.professor_regente_id] : []),
              equipe_apoio_ids: t.equipe_apoio_ids || [],
            }));
            setTurmas(sanitizedTurmas);
          }
        } catch (e) {
          console.error('Falha ao ler school_os_turmas:', e);
          setTurmas(initialTurmas);
        }
      } else {
        setTurmas(initialTurmas);
      }

      // Professores persistidos (com validação de integridade pós-migração)
      const savedProfessores = localStorage.getItem('school_os_professores');
      if (savedProfessores) {
        try {
          const parsedProfessores: Professor[] = JSON.parse(savedProfessores);
          const hasLegacyDummy = parsedProfessores.some(p => p.id.startsWith('prof-'));
          if (hasLegacyDummy || parsedProfessores.length < 20) {
            setProfessores(initialProfessores);
            localStorage.setItem('school_os_professores', JSON.stringify(initialProfessores));
          } else {
            const sanitizedProfessores = parsedProfessores.map((p) => ({
              ...p,
              ativo: p.ativo !== false,
            }));
            setProfessores(sanitizedProfessores);
          }
        } catch (e) {
          console.error('Falha ao ler school_os_professores:', e);
          setProfessores(initialProfessores);
        }
      } else {
        setProfessores(initialProfessores);
      }

      // Faltas persistidas
      const savedFaltas = localStorage.getItem('school_os_faltas');
      if (savedFaltas) {
        setFaltasProfessores(JSON.parse(savedFaltas));
      }

      // Eventos persistidos
      const savedEventos = localStorage.getItem('school_os_eventos');
      if (savedEventos) {
        setEventos(JSON.parse(savedEventos));
      }

      // Activity Logs persistidos
      const savedLogs = localStorage.getItem('school_os_activity_logs');
      if (savedLogs) {
        setActivityLogs(JSON.parse(savedLogs));
      }

      // Relatórios Pedagógicos persistidos
      const savedSol = localStorage.getItem('school_os_solicitacoes_relatorio');
      if (savedSol) setSolicitacoesRelatorio(JSON.parse(savedSol));

      const savedRelProf = localStorage.getItem('school_os_relatorios_professores');
      if (savedRelProf) setRelatoriosProfessores(JSON.parse(savedRelProf));

      const savedRelCons = localStorage.getItem('school_os_relatorios_consolidados');
      if (savedRelCons) setRelatoriosConsolidados(JSON.parse(savedRelCons));

      const savedNotifs = localStorage.getItem('school_os_notificacoes_admin');
      if (savedNotifs) setNotificacoesAdmin(JSON.parse(savedNotifs));

      // Observações Alunos persistidas
      const savedObs = localStorage.getItem('school_os_observacoes_aluno');
      if (savedObs) setObservacoesAluno(JSON.parse(savedObs));

      const savedObsAudit = localStorage.getItem('school_os_observacoes_auditoria');
      if (savedObsAudit) setObservacoesAuditoria(JSON.parse(savedObsAudit));

      // Documentos Drive persistidos
      const savedDriveDocs = localStorage.getItem('school_os_documentos_drive');
      if (savedDriveDocs) setDocumentosEstudanteDrive(JSON.parse(savedDriveDocs));

      // Atestados Professores persistidos
      const savedAtests = localStorage.getItem('school_os_atestados_professor');
      if (savedAtests) setAtestadosProfessor(JSON.parse(savedAtests));

      // Reposições Aulas persistidas
      const savedRep = localStorage.getItem('school_os_reposicoes_aulas');
      if (savedRep) setReposicoesAulas(JSON.parse(savedRep));
    } catch (e) {
      console.error('Falha ao ler localStorage:', e);
    } finally {
      setIsInitialized(true);
    }

    // Carregar todo o banco de dados diretamente do Turso
    fetch('/api/turso/data')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const {
            escolaConfig: tConfig,
            users: tUsers,
            professores: tProf,
            turmas: tTurmas,
            estudantes: tEst,
            faltasProfessores: tFaltas,
            eventos: tEventos,
            activityLogs: tLogs,
          } = json.data;

          if (tConfig) {
            setEscolaConfigState(tConfig);
            localStorage.setItem('school_os_config', JSON.stringify(tConfig));
          }
          if (tUsers && tUsers.length > 0) {
            const cleanUsers = tUsers
              .filter((u: SystemUser) => !['user-prof-1', 'user-prof-2', 'user-prof-3'].includes(u.id))
              .map((u: SystemUser) => ({
                ...u,
                must_change_password:
                  localStorage.getItem(`plugue_pwd_changed_${u.id}`) === 'true'
                    ? false
                    : (Number((u as any).must_change_password) === 1 || u.must_change_password === true || (u as any).must_change_password === '1'),
              }));
            setUsers(cleanUsers);
            localStorage.setItem('school_os_users', JSON.stringify(cleanUsers));

            // Preserva a sessão e os dados do usuário que efetuou login
            let activeUser: SystemUser | null = null;
            try {
              const sessionUserStr = sessionStorage.getItem('plugue_auth_user') || sessionStorage.getItem('plugue_session_user');
              if (sessionUserStr) {
                activeUser = JSON.parse(sessionUserStr);
              }
            } catch {}

            const activeCpf = activeUser?.cpf?.replace(/\D/g, '');
            const activeId = activeUser?.id || localStorage.getItem('school_os_current_user_id');

            const found = cleanUsers.find((u: SystemUser) => {
              if (activeId && u.id === activeId) return true;
              if (activeCpf && u.cpf?.replace(/\D/g, '') === activeCpf) return true;
              return false;
            }) || activeUser;

            if (found) {
              const sanitizedFound = {
                ...found,
                must_change_password:
                  localStorage.getItem(`plugue_pwd_changed_${found.id}`) === 'true'
                    ? false
                    : (Number(found.must_change_password) === 1 || found.must_change_password === true || found.must_change_password === '1'),
              };
              setCurrentUserState(sanitizedFound);
              setRoleState(sanitizedFound.role);
              if (activeUser) {
                setAuthenticatedUserState(sanitizedFound);
                try {
                  sessionStorage.setItem('plugue_auth_user', JSON.stringify(sanitizedFound));
                  sessionStorage.setItem('plugue_session_user', JSON.stringify(sanitizedFound));
                } catch {}
              }
            } else if (!activeUser) {
              setCurrentUserState(cleanUsers[0]);
              setRoleState(cleanUsers[0].role);
            }
          }
          if (tProf && tProf.length > 0) {
            const cleanProf = tProf.filter((p: Professor) => !p.id.startsWith('prof-'));
            setProfessores(cleanProf);
            localStorage.setItem('school_os_professores', JSON.stringify(cleanProf));
          }
          if (tTurmas && tTurmas.length > 0) {
            setTurmas(tTurmas);
            localStorage.setItem('school_os_turmas', JSON.stringify(tTurmas));
          }
          if (tEst && tEst.length > 0) {
            const cleanEst = tEst.map((e: Estudante) => ({
              ...e,
              possui_laudo: e.possui_laudo === true || (e as any).possui_laudo === 1 || (e as any).possui_laudo === '1' || String((e as any).possui_laudo).toLowerCase() === 'sim' || String((e as any).possui_laudo).toLowerCase() === 'true',
              aee: e.aee === true || (e as any).aee === 1 || (e as any).aee === '1' || String((e as any).aee).toLowerCase() === 'sim' || String((e as any).aee).toLowerCase() === 'true',
            }));
            setEstudantes(cleanEst);
            localStorage.setItem('school_os_estudantes', JSON.stringify(cleanEst));
          }
          if (tFaltas && tFaltas.length > 0) {
            setFaltasProfessores(tFaltas);
            localStorage.setItem('school_os_faltas', JSON.stringify(tFaltas));
          }
          if (tEventos && tEventos.length > 0) {
            setEventos(tEventos);
            localStorage.setItem('school_os_eventos', JSON.stringify(tEventos));
          }
          if (tLogs && tLogs.length > 0) {
            setActivityLogs(tLogs);
            localStorage.setItem('school_os_activity_logs', JSON.stringify(tLogs));
          }
          if (json.data.solicitacoesRelatorio && json.data.solicitacoesRelatorio.length > 0) {
            setSolicitacoesRelatorio(json.data.solicitacoesRelatorio);
            localStorage.setItem('school_os_solicitacoes_relatorio', JSON.stringify(json.data.solicitacoesRelatorio));
          }
          if (json.data.relatoriosProfessores && json.data.relatoriosProfessores.length > 0) {
            setRelatoriosProfessores(json.data.relatoriosProfessores);
            localStorage.setItem('school_os_relatorios_professores', JSON.stringify(json.data.relatoriosProfessores));
          }
          if (json.data.relatoriosConsolidados && json.data.relatoriosConsolidados.length > 0) {
            setRelatoriosConsolidados(json.data.relatoriosConsolidados);
            localStorage.setItem('school_os_relatorios_consolidados', JSON.stringify(json.data.relatoriosConsolidados));
          }
          if (json.data.notificacoesAdmin && json.data.notificacoesAdmin.length > 0) {
            setNotificacoesAdmin(json.data.notificacoesAdmin);
            localStorage.setItem('school_os_notificacoes_admin', JSON.stringify(json.data.notificacoesAdmin));
          }
          if (Array.isArray(json.data.observacoesAluno)) {
            const ativas = json.data.observacoesAluno.filter((o: ObservacaoAluno) => {
              if (o.deleted_at && o.deleted_at !== '' && o.deleted_at !== '0' && o.deleted_at !== 0 && o.deleted_at !== 'null') return false;
              if (o.is_deleted === 1 || o.is_deleted === '1' || o.is_deleted === true) return false;
              if (o.ativo === 0 || o.ativo === '0' || o.ativo === false) return false;
              return true;
            });
            setObservacoesAluno(ativas);
            localStorage.setItem('school_os_observacoes_aluno', JSON.stringify(ativas));
          }
          if (Array.isArray(json.data.observacoesAuditoria)) {
            setObservacoesAuditoria(json.data.observacoesAuditoria);
            localStorage.setItem('school_os_observacoes_auditoria', JSON.stringify(json.data.observacoesAuditoria));
          }
          if (json.data.documentosEstudanteDrive && json.data.documentosEstudanteDrive.length > 0) {
            setDocumentosEstudanteDrive(json.data.documentosEstudanteDrive);
            localStorage.setItem('school_os_documentos_drive', JSON.stringify(json.data.documentosEstudanteDrive));
          }
          if (json.data.atestadosProfessor && json.data.atestadosProfessor.length > 0) {
            setAtestadosProfessor(json.data.atestadosProfessor);
            localStorage.setItem('school_os_atestados_professor', JSON.stringify(json.data.atestadosProfessor));
          }
          if (json.data.reposicoesAulas && json.data.reposicoesAulas.length > 0) {
            setReposicoesAulas(json.data.reposicoesAulas);
            localStorage.setItem('school_os_reposicoes_aulas', JSON.stringify(json.data.reposicoesAulas));
          }
        }
      })
      .catch((err) => {
        console.warn('Usando dados em cache local devido à indisponibilidade momentânea do Turso:', err);
      });
  }, []);

  // Garante reativamente que o perfil Professor sempre exiba o Nome Completo oficial do banco
  useEffect(() => {
    if (currentUser?.role === 'professor' && professores.length > 0) {
      const cpfLimpoUser = currentUser.cpf?.replace(/\D/g, '');
      const prof = professores.find(
        (p) =>
          (cpfLimpoUser && p.cpf?.replace(/\D/g, '') === cpfLimpoUser) ||
          p.id === currentUser.id ||
          p.id.toLowerCase() === currentUser.id.toLowerCase() ||
          (p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.name && p.nome_completo?.toLowerCase() === currentUser.name.toLowerCase())
      );
      if (prof && prof.nome_completo && currentUser.name !== prof.nome_completo) {
        setCurrentUserState((prev) => ({
          ...prev,
          name: prof.nome_completo,
        }));
      }
    }
  }, [currentUser, professores]);

  // Sincronizador de mutações com o Turso
  const syncWithTurso = async (action: string, payload: any) => {
    try {
      await fetch('/api/turso/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
    } catch (err) {
      console.warn(`[Turso Sync] Falha ao sincronizar ${action}:`, err);
    }
  };

  // Persistência quando os estados mudam
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_estudantes', JSON.stringify(estudantes));
    } catch (e) {
      console.error(e);
    }
  }, [estudantes, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_turmas', JSON.stringify(turmas));
    } catch (e) {
      console.error(e);
    }
  }, [turmas, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_professores', JSON.stringify(professores));
    } catch (e) {
      console.error(e);
    }
  }, [professores, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_faltas', JSON.stringify(faltasProfessores));
    } catch (e) {
      console.error(e);
    }
  }, [faltasProfessores, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_eventos', JSON.stringify(eventos));
    } catch (e) {
      console.error(e);
    }
  }, [eventos, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_activity_logs', JSON.stringify(activityLogs));
    } catch (e) {
      console.error(e);
    }
  }, [activityLogs, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_solicitacoes_relatorio', JSON.stringify(solicitacoesRelatorio));
    } catch (e) {
      console.error(e);
    }
  }, [solicitacoesRelatorio, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_relatorios_professores', JSON.stringify(relatoriosProfessores));
    } catch (e) {
      console.error(e);
    }
  }, [relatoriosProfessores, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_relatorios_consolidados', JSON.stringify(relatoriosConsolidados));
    } catch (e) {
      console.error(e);
    }
  }, [relatoriosConsolidados, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_notificacoes_admin', JSON.stringify(notificacoesAdmin));
    } catch (e) {
      console.error(e);
    }
  }, [notificacoesAdmin, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_observacoes_aluno', JSON.stringify(observacoesAluno));
    } catch (e) {
      console.error(e);
    }
  }, [observacoesAluno, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_observacoes_auditoria', JSON.stringify(observacoesAuditoria));
    } catch (e) {
      console.error(e);
    }
  }, [observacoesAuditoria, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_documentos_drive', JSON.stringify(documentosEstudanteDrive));
    } catch (e) {
      console.error(e);
    }
  }, [documentosEstudanteDrive, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_atestados_professor', JSON.stringify(atestadosProfessor));
    } catch (e) {
      console.error(e);
    }
  }, [atestadosProfessor, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('school_os_reposicoes_aulas', JSON.stringify(reposicoesAulas));
    } catch (e) {
      console.error(e);
    }
  }, [reposicoesAulas, isInitialized]);


  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    localStorage.setItem('school_os_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  };

  const setCurrentUser = (user: SystemUser) => {
    // Bloqueio de simulação: Usuário logado como Professor não pode simular outro perfil/usuário
    if (!isAdminSession && authenticatedUser && user.id !== authenticatedUser.id) {
      console.warn('Operação bloqueada: Usuário logado como Professor não possui permissão para simular outros usuários.');
      return;
    }

    setCurrentUserState(user);
    setRoleState(user.role);
    setIsAuthenticated(true);
    if (!authenticatedUser) {
      setAuthenticatedUserState(user);
    }
    try {
      if (!authenticatedUser) {
        sessionStorage.setItem('plugue_auth_user', JSON.stringify(user));
      }
      sessionStorage.setItem('plugue_session_active', 'true');
      sessionStorage.setItem('plugue_session_user', JSON.stringify(user));
      localStorage.setItem('school_os_current_user_id', user.id);
      localStorage.setItem('school_os_role', user.role);
    } catch (e) {
      console.error('Falha ao salvar sessão:', e);
    }

    // Rota inicial obrigatória: quando professor for ativado, destino padrão sempre Dashboard
    if (user.role === 'professor' && typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p !== '/' && p !== '/dashboard' && p !== '/fotograma' && p !== '/calendario') {
        window.location.href = '/dashboard';
      }
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Falha ao deslogar da API:', err);
    }

    try {
      sessionStorage.removeItem('plugue_session_active');
      sessionStorage.removeItem('plugue_session_user');
      sessionStorage.removeItem('plugue_auth_user');
      localStorage.removeItem('school_os_current_user_id');
      localStorage.removeItem('plugue_lembrar_usuario');
    } catch (e) {
      // ignore
    }

    setAuthenticatedUserState(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const setRole = (newRole: UserRole) => {
    // Bloqueio de troca de perfil: Usuários logados como Professor NÃO podem alternar para nenhum outro perfil
    if (!isAdminSession && newRole !== 'professor') {
      console.warn('Operação bloqueada: Usuário logado como Professor não possui permissão para alternar de perfil.');
      return;
    }

    setRoleState(newRole);
    localStorage.setItem('school_os_role', newRole);
    // Sincroniza currentUser para um usuário com essa role
    const matchingUser = users.find((u) => u.role === newRole && u.is_active);
    if (matchingUser) {
      setCurrentUserState(matchingUser);
      localStorage.setItem('school_os_current_user_id', matchingUser.id);
    }

    // Rota inicial obrigatória: ao alternar para professor, redireciona para Dashboard se estiver em rota restrita
    if (newRole === 'professor' && typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p !== '/' && p !== '/dashboard' && p !== '/fotograma' && p !== '/calendario') {
        window.location.href = '/dashboard';
      }
    }
  };

  const addUser = (userData: { name: string; email?: string; cpf: string; role: UserRole; allowed_modules?: AllowedModule[]; is_active?: boolean }) => {
    const cleanCpf = userData.cpf.replace(/\D/g, '');
    const newUser: SystemUser = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      cpf: cleanCpf,
      password_hash: cleanCpf, // Senha inicial padrão = CPF (apenas dígitos)
      role: userData.role,
      must_change_password: true, // Força primeiro acesso com troca de senha
      allowed_modules: userData.role === 'admin' 
        ? ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'] 
        : (userData.allowed_modules?.length ? userData.allowed_modules : ['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = [newUser, ...prev];
      localStorage.setItem('school_os_users', JSON.stringify(updated));
      return updated;
    });
    syncWithTurso('save_user', newUser);
  };

  const updateUser = (id: string, updates: Partial<SystemUser>) => {
    let updatedUser: SystemUser | undefined;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const mod = { ...u, ...updates };
          if (updates.cpf) {
            mod.cpf = updates.cpf.replace(/\D/g, '');
          }
          if (currentUser.id === id) {
            setCurrentUserState(mod);
            if (updates.role) {
              setRoleState(updates.role);
            }
          }
          updatedUser = mod;
          return mod;
        }
        return u;
      });
      localStorage.setItem('school_os_users', JSON.stringify(updated));
      return updated;
    });
    if (updatedUser) {
      syncWithTurso('save_user', updatedUser);
    }
  };

  const resetUserPassword = (id: string) => {
    try {
      localStorage.removeItem(`plugue_pwd_changed_${id}`);
    } catch {}
    let updatedUser: SystemUser | undefined;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const cleanCpf = u.cpf.replace(/\D/g, '');
          const mod = {
            ...u,
            password_hash: cleanCpf, // Redefine para o CPF sem pontuação
            must_change_password: true, // Força a redefinição de senha
          };
          if (currentUser.id === id) {
            setCurrentUserState(mod);
          }
          if (authenticatedUser?.id === id) {
            setAuthenticatedUserState(mod);
          }
          updatedUser = mod;
          return mod;
        }
        return u;
      });
      localStorage.setItem('school_os_users', JSON.stringify(updated));
      return updated;
    });
    if (updatedUser) {
      syncWithTurso('save_user', updatedUser);
    }
  };

  const changePassword = (userId: string, newPassword: string) => {
    try {
      localStorage.setItem(`plugue_pwd_changed_${userId}`, 'true');
    } catch {}
    let updatedUser: SystemUser | undefined;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          const mod = {
            ...u,
            password_hash: newPassword,
            must_change_password: false,
          };
          if (currentUser.id === userId) {
            setCurrentUserState(mod);
          }
          if (authenticatedUser?.id === userId) {
            setAuthenticatedUserState(mod);
          }
          updatedUser = mod;
          return mod;
        }
        return u;
      });
      localStorage.setItem('school_os_users', JSON.stringify(updated));
      return updated;
    });

    try {
      const sessAuth = sessionStorage.getItem('plugue_auth_user');
      if (sessAuth) {
        const parsed = JSON.parse(sessAuth);
        if (parsed.id === userId) {
          sessionStorage.setItem('plugue_auth_user', JSON.stringify({ ...parsed, must_change_password: false }));
        }
      }
      const sessUser = sessionStorage.getItem('plugue_session_user');
      if (sessUser) {
        const parsed = JSON.parse(sessUser);
        if (parsed.id === userId) {
          sessionStorage.setItem('plugue_session_user', JSON.stringify({ ...parsed, must_change_password: false }));
        }
      }
    } catch (e) {
      console.error('Falha ao atualizar sessão após troca de senha:', e);
    }

    if (updatedUser) {
      syncWithTurso('save_user', updatedUser);
    }
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      localStorage.setItem('school_os_users', JSON.stringify(updated));
      return updated;
    });
    syncWithTurso('delete_user', { id });
  };

  const updateEscolaConfig = (newConfig: Partial<EscolaConfig>) => {
    setEscolaConfigState((prev) => {
      const updated = { ...prev, ...newConfig, updated_at: new Date().toISOString() };
      localStorage.setItem('school_os_config', JSON.stringify(updated));
      syncWithTurso('save_config', updated);
      return updated;
    });
  };

  const addEstudante = (novoEstudante: Omit<Estudante, 'id' | 'created_at' | 'documentos'>) => {
    const turma = turmas.find(t => t.id === novoEstudante.turma_id);
    const estudanteCriado: Estudante = {
      ...novoEstudante,
      id: `est-${Date.now()}`,
      turma_nome: turma?.nome || 'Turma não atribuída',
      documentos: [],
      created_at: new Date().toISOString(),
    };
    setEstudantes((prev) => [estudanteCriado, ...prev]);
    syncWithTurso('save_estudante', estudanteCriado);
  };

  const updateEstudante = (id: string, updates: Partial<Estudante>) => {
    let updatedEst: Estudante | undefined;
    setEstudantes((prev) =>
      prev.map((est) => {
        if (est.id === id) {
          const updated = { ...est, ...updates };
          if (updates.turma_id) {
            const turma = turmas.find(t => t.id === updates.turma_id);
            updated.turma_nome = turma?.nome || updated.turma_nome;
          }
          updatedEst = updated;
          return updated;
        }
        return est;
      })
    );
    if (updatedEst) {
      syncWithTurso('save_estudante', updatedEst);
    }
  };

  const deleteEstudante = (id: string) => {
    setEstudantes((prev) => prev.filter((est) => est.id !== id));
    syncWithTurso('delete_estudante', { id });
  };

  const addDocumentoToEstudante = (
    estudanteId: string, 
    doc: Omit<DocumentoEstudante, 'id' | 'created_at' | 'estudante_id'>
  ) => {
    const novoDoc: DocumentoEstudante = {
      ...doc,
      id: `doc-${Date.now()}`,
      estudante_id: estudanteId,
      created_at: new Date().toISOString(),
    };
    setEstudantes((prev) =>
      prev.map((est) => {
        if (est.id === estudanteId) {
          return {
            ...est,
            documentos: [...est.documentos, novoDoc],
          };
        }
        return est;
      })
    );
    syncWithTurso('save_documento', novoDoc);
  };

  const addTurma = (novaTurma: Omit<Turma, 'id' | 'created_at' | 'grade_horaria'>) => {
    const regenteId = novaTurma.professores_ids?.[0] || novaTurma.professor_regente_id;
    const regente = professores.find((p) => p.id === regenteId);
    const turmaCriada: Turma = {
      ...novaTurma,
      id: `turma-${Date.now()}`,
      professor_regente_id: regenteId,
      professor_regente_nome: regente?.nome_completo,
      professores_ids: novaTurma.professores_ids || (regenteId ? [regenteId] : []),
      equipe_apoio_ids: novaTurma.equipe_apoio_ids || [],
      grade_horaria: [],
      ativa: novaTurma.ativa !== false,
      created_at: new Date().toISOString(),
    };
    setTurmas((prev) => {
      const updated = [...prev, turmaCriada];
      localStorage.setItem('school_os_turmas', JSON.stringify(updated));
      return updated;
    });
    syncWithTurso('save_turma', turmaCriada);
  };

  const updateTurma = (id: string, updates: Partial<Turma>) => {
    let updatedTurma: Turma | undefined;
    setTurmas((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          const mod = { ...t, ...updates };
          if (updates.professores_ids !== undefined) {
            mod.professores_ids = updates.professores_ids;
            if (updates.professores_ids.length > 0) {
              const regente = professores.find((p) => p.id === updates.professores_ids![0]);
              mod.professor_regente_id = updates.professores_ids[0];
              mod.professor_regente_nome = regente?.nome_completo;
            } else {
              mod.professor_regente_id = undefined;
              mod.professor_regente_nome = undefined;
            }
          }
          updatedTurma = mod;
          return mod;
        }
        return t;
      });
      localStorage.setItem('school_os_turmas', JSON.stringify(updated));
      return updated;
    });

    // Se o nome da turma foi alterado, atualiza o turma_nome dos estudantes preservando o vínculo turma_id 100% intacto
    if (updates.nome) {
      setEstudantes((prev) => {
        const updatedEst = prev.map((est) =>
          est.turma_id === id ? { ...est, turma_nome: updates.nome! } : est
        );
        localStorage.setItem('school_os_estudantes', JSON.stringify(updatedEst));
        return updatedEst;
      });
    }

    if (updatedTurma) {
      syncWithTurso('save_turma', updatedTurma);
    }
  };

  const addProfessor = (novoProf: Omit<Professor, 'id' | 'created_at'>) => {
    const profCriado: Professor = {
      ...novoProf,
      id: `prof-${Date.now()}`,
      ativo: novoProf.ativo !== false,
      created_at: new Date().toISOString(),
    };
    setProfessores((prev) => {
      const updated = [...prev, profCriado];
      localStorage.setItem('school_os_professores', JSON.stringify(updated));
      return updated;
    });
    syncWithTurso('save_professor', profCriado);
  };

  const updateProfessor = (id: string, updates: Partial<Professor>) => {
    let updatedProf: Professor | undefined;
    setProfessores((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const mod = { ...p, ...updates };
          updatedProf = mod;
          return mod;
        }
        return p;
      });
      localStorage.setItem('school_os_professores', JSON.stringify(updated));
      return updated;
    });
    if (updatedProf) {
      syncWithTurso('save_professor', updatedProf);
    }
  };

  const toggleProfessorApoio = (id: string) => {
    let updatedProf: Professor | undefined;
    setProfessores((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const mod = { ...p, eh_apoio: !p.eh_apoio };
          updatedProf = mod;
          return mod;
        }
        return p;
      });
      return updated;
    });
    if (updatedProf) {
      syncWithTurso('save_professor', updatedProf);
    }
  };

  const addFaltaProfessor = (novaFalta: Omit<FaltaProfessor, 'id' | 'created_at' | 'homologado'>) => {
    const prof = professores.find(p => p.id === novaFalta.professor_id);
    const faltaCriada: FaltaProfessor = {
      ...novaFalta,
      id: `falta-${Date.now()}`,
      professor_nome: prof?.nome_completo || 'Professor',
      homologado: false,
      created_at: new Date().toISOString(),
    };
    setFaltasProfessores((prev) => [faltaCriada, ...prev]);
    syncWithTurso('save_falta', faltaCriada);
  };

  const toggleHomologarFalta = (id: string) => {
    let updatedFalta: FaltaProfessor | undefined;
    setFaltasProfessores((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const mod = { ...f, homologado: !f.homologado };
          updatedFalta = mod;
          return mod;
        }
        return f;
      })
    );
    if (updatedFalta) {
      syncWithTurso('save_falta', updatedFalta);
    }
  };

  const addEvento = (novoEvento: Omit<EventoEscolar, 'id' | 'created_at'>) => {
    const eventoCriado: EventoEscolar = {
      ...novoEvento,
      id: `ev-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setEventos((prev) => [...prev, eventoCriado]);
    syncWithTurso('save_evento', eventoCriado);
  };

  const deleteEvento = (id: string) => {
    setEventos((prev) => prev.filter((ev) => ev.id !== id));
    syncWithTurso('delete_evento', { id });
  };

  const addActivityLog = async (logData: Omit<ActivityLog, 'id' | 'created_at'>): Promise<ActivityLog> => {
    const newLog: ActivityLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    // Atualização otimista
    setActivityLogs((prev) => [newLog, ...prev]);

    // Persistência Append-Only no Turso
    try {
      const res = await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setActivityLogs((prev) => prev.map((l) => (l.id === newLog.id ? data.log : l)));
          return data.log;
        }
      }
    } catch (err) {
      console.warn('Log mantido localmente. Erro ao sincronizar com Turso:', err);
    }

    return newLog;
  };

  const refreshActivityLogs = async () => {
    try {
      const res = await fetch('/api/auditoria');
      if (res.ok) {
        const data = await res.json();
        if (data.logs && Array.isArray(data.logs)) {
          setActivityLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar logs:', err);
    }
  };

  const toggleStatusTurma = async (turmaId: string, novaAtiva: boolean) => {
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma) return;

    const statusAnterior = turma.ativa !== false;
    if (statusAnterior === novaAtiva) return;

    // Estudantes vinculados
    const estudantesTurma = estudantes.filter((e) => e.turma_id === turmaId);
    const novoStatusMatricula = novaAtiva ? 'Ativo' : 'Trancado';

    const estudantesAfetados: EstudanteAfetadoLog[] = estudantesTurma.map((est) => ({
      id: est.id,
      nome: est.nome_completo,
      status_anterior: est.status_matricula,
      status_novo: novoStatusMatricula,
    }));

    // Atualiza status da turma
    setTurmas((prev) =>
      prev.map((t) => (t.id === turmaId ? { ...t, ativa: novaAtiva } : t))
    );

    // Atualiza status dos estudantes vinculados
    setEstudantes((prev) =>
      prev.map((est) => {
        if (est.turma_id === turmaId) {
          return {
            ...est,
            status_matricula: novoStatusMatricula as Estudante['status_matricula'],
          };
        }
        return est;
      })
    );

    // Registra log imutável
    const userName = role === 'admin' ? 'Administrador Geral' : 'Professor';

    const resumo = novaAtiva
      ? `Status alterado para Ativo (${estudantesAfetados.length} alunos reativados)`
      : `Status alterado para Inativo (${estudantesAfetados.length} alunos trancados)`;

    syncWithTurso('save_turma', { ...turma, ativa: novaAtiva });
    estudantesTurma.forEach((est) => {
      syncWithTurso('save_estudante', { ...est, status_matricula: novoStatusMatricula });
    });

    await addActivityLog({
      action_type: 'CLASS_STATUS_CHANGE',
      user_id: `user-${role}`,
      user_name: userName,
      target_class_id: turmaId,
      target_class_name: turma.nome,
      details: {
        resumo,
        status_anterior: statusAnterior,
        status_novo: novaAtiva,
        total_afetados: estudantesAfetados.length,
        estudantes_afetados: estudantesAfetados,
      },
    });
  };

  const migrarEstudantes = async (
    estudantesIds: string[],
    turmaOrigemId: string,
    turmaDestinoId: string
  ) => {
    if (!estudantesIds || estudantesIds.length === 0) return;

    const turmaOrigem = turmas.find((t) => t.id === turmaOrigemId);
    const turmaDestino = turmas.find((t) => t.id === turmaDestinoId);

    if (!turmaDestino) return;

    const estudantesParaMigrar = estudantes.filter((e) =>
      estudantesIds.includes(e.id)
    );

    const estudantesAfetados: EstudanteAfetadoLog[] = estudantesParaMigrar.map((est) => ({
      id: est.id,
      nome: est.nome_completo,
      status_anterior: est.turma_nome || turmaOrigem?.nome || 'Turma anterior',
      status_novo: turmaDestino.nome,
    }));

    // Atualiza turma dos estudantes
    setEstudantes((prev) =>
      prev.map((est) => {
        if (estudantesIds.includes(est.id)) {
          return {
            ...est,
            turma_id: turmaDestinoId,
            turma_nome: turmaDestino.nome,
          };
        }
        return est;
      })
    );

    syncWithTurso('migrar_estudantes', {
      estudantesIds,
      turmaDestinoId,
      turmaDestinoNome: turmaDestino.nome,
    });

    const userName = role === 'admin' ? 'Administrador Geral' : 'Professor';

    const resumo = `${estudantesAfetados.length} aluno(s) migrado(s) para ${turmaDestino.nome}`;

    await addActivityLog({
      action_type: 'STUDENT_MIGRATION',
      user_id: `user-${role}`,
      user_name: userName,
      target_class_id: turmaDestinoId,
      target_class_name: `${turmaOrigem?.nome || 'Origem'} ➡️ ${turmaDestino.nome}`,
      details: {
        resumo,
        turma_origem_id: turmaOrigemId,
        turma_origem_nome: turmaOrigem?.nome || 'Turma Origem',
        turma_destino_id: turmaDestinoId,
        turma_destino_nome: turmaDestino.nome,
        total_afetados: estudantesAfetados.length,
        estudantes_afetados: estudantesAfetados,
      },
    });
  };

  // 1. Relatórios Pedagógicos Colaborativos com IA
  const addSolicitacaoRelatorio = (alunoId: string, _adminId?: string, professoresIdsParam?: string[], _obs?: string): string => {
    const novaSolId = `sol-${Date.now()}`;
    const novaSol: SolicitacaoRelatorio = {
      id: novaSolId,
      aluno_id: alunoId,
      status: 'pendente',
      data_solicitacao: new Date().toISOString().split('T')[0],
      admin_solicitante_id: _adminId || currentUser.id,
      created_at: new Date().toISOString(),
    };

    setSolicitacoesRelatorio(prev => [novaSol, ...prev]);

    // Localiza os professores atribuídos à turma do estudante
    const aluno = estudantes.find(e => e.id === alunoId);
    const turma = turmas.find(t => t.id === aluno?.turma_id || (t.nome && aluno?.turma_nome && t.nome.trim() === aluno.turma_nome.trim()));

    let profsIds: string[] = [];
    if (professoresIdsParam && professoresIdsParam.length > 0) {
      profsIds = [...professoresIdsParam];
    } else if (turma?.professores_ids && turma.professores_ids.length > 0) {
      profsIds = [...turma.professores_ids];
    }
    if (turma?.professor_regente_id && !profsIds.includes(turma.professor_regente_id)) {
      profsIds.push(turma.professor_regente_id);
    }

    // Inclui professores que tenham a turma explicitamente vinculada em suas fichas
    professores.forEach(p => {
      if (turma?.id && p.turmas_atribuidas_ids && p.turmas_atribuidas_ids.includes(turma.id)) {
        if (!profsIds.includes(p.id)) profsIds.push(p.id);
      }
    });

    if (profsIds.length === 0) {
      profsIds = professores.filter(p => p.ativo).slice(0, 3).map(p => p.id);
    }

    const novosRelatoriosProfessores: RelatorioProfessor[] = profsIds.map(profId => ({
      id: `rel-prof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      solicitacao_id: novaSolId,
      professor_id: profId,
      rascunho_original: '',
      texto_ia: '',
      texto_final: '',
      status: 'pendente',
      created_at: new Date().toISOString(),
    }));

    setRelatoriosProfessores(prev => [...novosRelatoriosProfessores, ...prev]);
    return novaSolId;
  };

  const salvarRascunhoProfessor = (relatorioId: string, rascunho: string) => {
    setRelatoriosProfessores(prev =>
      prev.map(r => (r.id === relatorioId ? { ...r, rascunho_original: rascunho, texto_final: r.texto_final || rascunho } : r))
    );
  };

  const polirRelatorioComIA = async (
    relatorioId: string, 
    rascunho: string,
    dadosExtras?: { estudante?: Estudante; turma?: Turma }
  ): Promise<string> => {
    const rel = relatoriosProfessores.find(r => r.id === relatorioId);
    const sol = solicitacoesRelatorio.find(s => s.id === rel?.solicitacao_id);
    const aluno = dadosExtras?.estudante || estudantes.find(e => e.id === sol?.aluno_id);
    const turma = dadosExtras?.turma || turmas.find(t => t.id === aluno?.turma_id);
    const prof = professores.find(p => p.id === rel?.professor_id);

    const nomeEstudante = aluno?.nome_completo || 'Estudante';
    const generoEstudante = aluno?.genero || (aluno as any)?.sexo || '';

    const res = await fetch('/api/ia/polir-relatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rascunho,
        alunoNome: nomeEstudante,
        estudanteNome: nomeEstudante,
        alunoGenero: generoEstudante,
        estudanteGenero: generoEstudante,
        genero: generoEstudante,
        turmaNome: turma?.nome || '',
        disciplina: prof?.disciplinas?.join(', ') || '',
        professorNome: prof?.nome_completo || currentUser.name,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao polir parecer com IA.');
    }

    const textoIa = data.texto_ia || rascunho;
    setRelatoriosProfessores(prev =>
      prev.map(r => (r.id === relatorioId ? { ...r, rascunho_original: rascunho, texto_ia: textoIa, texto_final: textoIa } : r))
    );

    return textoIa;
  };

  const enviarRelatorioProfessor = async (relatorioId: string, textoFinal: string) => {
    const rel = relatoriosProfessores.find(r => r.id === relatorioId);
    if (!rel) return;

    const sol = solicitacoesRelatorio.find(s => s.id === rel.solicitacao_id);
    const aluno = estudantes.find(e => e.id === sol?.aluno_id);
    const prof = professores.find(p => p.id === rel.professor_id);

    const agora = new Date().toISOString();

    setRelatoriosProfessores(prev =>
      prev.map(r => (r.id === relatorioId ? { ...r, texto_final: textoFinal, status: 'enviado', data_envio: agora } : r))
    );

    // Dispara alerta para todos os perfis Administradores / Direção
    const novaNotif: NotificacaoAdmin = {
      id: `notif-${Date.now()}`,
      relatorio_professor_id: relatorioId,
      solicitacao_id: rel.solicitacao_id,
      professor_id: rel.professor_id,
      professor_nome: prof?.nome_completo || currentUser.name,
      aluno_nome: aluno?.nome_completo || 'Estudante',
      lido: false,
      data_criacao: agora,
    };

    setNotificacoesAdmin(prev => [novaNotif, ...prev]);
  };

  const updateRelatorioProfessor = (relatorioId: string, updates: Partial<RelatorioProfessor>) => {
    setRelatoriosProfessores(prev =>
      prev.map(r => (r.id === relatorioId ? { ...r, ...updates } : r))
    );
  };

  const deleteRelatorioProfessor = (relatorioId: string) => {
    setRelatoriosProfessores(prev => prev.filter(r => r.id !== relatorioId));
  };

  const marcarNotificacaoLida = (notificacaoId: string) => {
    setNotificacoesAdmin(prev =>
      prev.map(n => (n.id === notificacaoId ? { ...n, lido: true } : n))
    );
  };

  const marcarTodasNotificacoesLidas = () => {
    setNotificacoesAdmin(prev => prev.map(n => ({ ...n, lido: true })));
  };

  const consolidarRelatorioComIA = async (solicitacaoId: string, observacoesSecretaria?: string): Promise<string> => {
    const sol = solicitacoesRelatorio.find(s => s.id === solicitacaoId);
    if (!sol) throw new Error('Solicitação não encontrada.');

    const aluno = estudantes.find(e => e.id === sol.aluno_id);
    const turma = turmas.find(t => t.id === aluno?.turma_id);

    const relsEnviados = relatoriosProfessores.filter(r => r.solicitacao_id === solicitacaoId && r.status === 'enviado');
    if (relsEnviados.length === 0) {
      throw new Error('Não há pareceres docentes enviados para consolidar.');
    }

    const pareceresPayload = relsEnviados.map(r => {
      const prof = professores.find(p => p.id === r.professor_id);
      return {
        professorNome: prof?.nome_completo || 'Docente',
        disciplinas: prof?.disciplinas || [],
        textoFinal: r.texto_final || r.rascunho_original,
      };
    });

    const res = await fetch('/api/ia/consolidar-relatorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunoNome: aluno?.nome_completo || 'Estudante',
        nome_estudante: aluno?.nome_completo || 'Estudante',
        genero: aluno?.genero || aluno?.sexo,
        sexo: aluno?.sexo || aluno?.genero,
        turmaNome: turma?.nome || '',
        turma_nome: turma?.nome || '',
        turno: turma?.turno || 'manha',
        turma_turno: turma?.turno || 'manha',
        pareceres: pareceresPayload,
        observacoesSecretaria,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao consolidar pareceres.');
    }

    const conteudoConsolidado = data.conteudo_consolidado;
    const agora = new Date().toISOString();

    const novoConsolidado: RelatorioConsolidado = {
      id: `rel-cons-${Date.now()}`,
      solicitacao_id: solicitacaoId,
      conteudo_final: conteudoConsolidado,
      data_geracao: agora,
      arquivo_docx_url: `/api/relatorios/docx?solicitacao_id=${solicitacaoId}`,
      created_at: agora,
    };

    setRelatoriosConsolidados(prev => {
      const filtrado = prev.filter(c => c.solicitacao_id !== solicitacaoId);
      return [novoConsolidado, ...filtrado];
    });

    setSolicitacoesRelatorio(prev =>
      prev.map(s => (s.id === solicitacaoId ? { ...s, status: 'concluido' } : s))
    );

    return conteudoConsolidado;
  };

  const salvarRelatorioConsolidado = (solicitacaoId: string, conteudoFinal: string, _observacoesSecretaria?: string) => {
    const agora = new Date().toISOString();

    setSolicitacoesRelatorio(prev =>
      prev.map(s => (s.id === solicitacaoId ? { ...s, status: 'concluido' } : s))
    );

    setRelatoriosConsolidados(prev => {
      const existe = prev.find(c => c.solicitacao_id === solicitacaoId);
      if (existe) {
        return prev.map(c => (c.solicitacao_id === solicitacaoId ? { ...c, conteudo_final: conteudoFinal } : c));
      }
      return [
        {
          id: `rel-cons-${Date.now()}`,
          solicitacao_id: solicitacaoId,
          conteudo_final: conteudoFinal,
          data_geracao: agora,
          arquivo_docx_url: `/api/relatorios/docx?solicitacao_id=${solicitacaoId}`,
          created_at: agora,
        },
        ...prev,
      ];
    });
  };

  const excluirSolicitacaoRelatorio = (solicitacaoId: string) => {
    setSolicitacoesRelatorio(prev => prev.filter(s => s.id !== solicitacaoId));
    setRelatoriosProfessores(prev => prev.filter(r => r.solicitacao_id !== solicitacaoId));
    setRelatoriosConsolidados(prev => prev.filter(c => c.solicitacao_id !== solicitacaoId));
    setNotificacoesAdmin(prev => prev.filter(n => n.solicitacao_id !== solicitacaoId));
  };

  // 6. Observações Contínuas do Estudante & Auditoria
  const addObservacaoAluno = async (
    arg1: any,
    arg2?: any,
    arg3?: any,
    arg4?: any,
    arg5?: any,
    arg6?: any
  ): Promise<ObservacaoAluno> => {
    let estudanteId = '';
    let categoria: TipoObservacaoAluno = 'pedagogico';
    let textoCompleto = '';
    let autorId = currentUser?.id || 'user-admin';
    let autorNome = currentUser?.name || 'Equipe Escolar';
    let autorCargo = role === 'admin' ? 'Administração Escolar' : role === 'direcao' ? 'Direção Escolar' : 'Professor';

    if (typeof arg1 === 'object' && arg1 !== null) {
      estudanteId = arg1.estudante_id || arg1.aluno_id || '';
      categoria = (arg1.categoria || arg1.tipo || 'pedagogico') as TipoObservacaoAluno;
      textoCompleto = arg1.texto_completo || arg1.texto || arg1.conteudo || '';
      if (arg1.usuario_id || arg1.autor_id) autorId = arg1.usuario_id || arg1.autor_id;
      if (arg1.usuario_nome || arg1.autor_nome) autorNome = arg1.usuario_nome || arg1.autor_nome;
      if (arg1.autor_cargo) autorCargo = arg1.autor_cargo;
    } else if (typeof arg5 === 'string') {
      // Chamada: (alunoId, autorId, autorNome, autorRole, texto, categoria)
      estudanteId = String(arg1);
      autorId = String(arg2 || autorId);
      autorNome = String(arg3 || autorNome);
      autorCargo = String(arg4 || autorCargo);
      textoCompleto = String(arg5 || '');
      categoria = (arg6 || 'pedagogico') as TipoObservacaoAluno;
    } else {
      // Chamada padrão: (alunoId, tipo, texto)
      estudanteId = String(arg1);
      categoria = (arg2 || 'pedagogico') as TipoObservacaoAluno;
      textoCompleto = String(arg3 || '');
    }

    const agora = new Date().toISOString();
    const dataReg = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novaObs: ObservacaoAluno = {
      id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      estudante_id: estudanteId,
      aluno_id: estudanteId,
      usuario_id: autorId,
      autor_id: autorId,
      autor_nome: autorNome,
      autor_cargo: autorCargo,
      categoria,
      tipo: categoria,
      texto_completo: textoCompleto,
      texto: textoCompleto,
      created_at: agora,
      data_registro: dataReg,
      deleted_at: null,
      is_deleted: 0,
      ativo: 1,
    };

    try {
      const res = await fetch('/api/observacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: novaObs.id,
          estudante_id: estudanteId,
          usuario_id: autorId,
          usuario_nome: autorNome,
          autor_nome: autorNome,
          autor_cargo: autorCargo,
          categoria,
          texto: textoCompleto,
          texto_completo: textoCompleto,
          created_at: agora,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Erro ao salvar observação:", data.error || data.details);
        throw new Error(data.error || 'Falha ao gravar observação no banco de dados.');
      }

      const obsConfirmada = data.observacao || novaObs;
      setObservacoesAluno(prev => [obsConfirmada, ...prev.filter(o => o.id !== obsConfirmada.id)]);

      const auditCriacao: ObservacaoAuditoria = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        observacao_id: obsConfirmada.id,
        estudante_id: estudanteId,
        evento: 'CREATE',
        texto_novo: textoCompleto,
        categoria,
        usuario_id: autorId,
        usuario_nome: autorNome,
        created_at: agora,
      };
      setObservacoesAuditoria(prev => [auditCriacao, ...prev]);

      return obsConfirmada;
    } catch (err: any) {
      console.error("Erro ao salvar observação:", err);
      // Tentativa de persistência via endpoint sync como redundância
      try {
        await fetch('/api/turso/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_observacao', payload: novaObs }),
        });
        setObservacoesAluno(prev => [novaObs, ...prev.filter(o => o.id !== novaObs.id)]);
        return novaObs;
      } catch (fallbackErr) {
        console.error('Falha no fallback de persistência de observação:', fallbackErr);
        throw new Error(err.message || 'Erro ao persistir observação pedagógica.');
      }
    }
  };

  const updateObservacaoAluno = async (obsId: string, novoTexto: string): Promise<void> => {
    const registroAnterior = observacoesAluno.find(o => o.id === obsId);
    if (!registroAnterior) return;

    // Regra de Edição: Apenas o usuário autor da observação pode editá-la!
    const autorId = registroAnterior.usuario_id || registroAnterior.autor_id;
    if (autorId !== currentUser.id && role !== 'admin') {
      throw new Error('Apenas o usuário autor da observação possui permissão para editá-la.');
    }

    const agora = new Date().toISOString();

    try {
      const res = await fetch('/api/observacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: obsId,
          observacao_id: obsId,
          texto: novoTexto,
          texto_completo: novoTexto,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          estudante_id: registroAnterior.estudante_id || registroAnterior.aluno_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Erro ao atualizar observação:", data.error);
        throw new Error(data.error || 'Falha ao atualizar observação.');
      }
    } catch (apiErr) {
      console.warn('Tentando fallback via /api/turso/sync para update:', apiErr);
      await fetch('/api/turso/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_observacao',
          payload: {
            observacao_id: obsId,
            novo_texto: novoTexto,
            usuario_id: currentUser.id,
            usuario_nome: currentUser.name,
            registro_anterior: registroAnterior,
          },
        }),
      });
    }

    setObservacoesAluno(prev =>
      prev.map(o => {
        if (o.id === obsId) {
          return {
            ...o,
            texto_completo: novoTexto,
            texto: novoTexto,
          };
        }
        return o;
      })
    );

    const auditAlteracao: ObservacaoAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      observacao_id: obsId,
      estudante_id: registroAnterior.estudante_id || registroAnterior.aluno_id,
      evento: 'UPDATE',
      texto_anterior: registroAnterior.texto_completo || registroAnterior.texto,
      texto_novo: novoTexto,
      categoria: registroAnterior.categoria || registroAnterior.tipo,
      registro_anterior: registroAnterior,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      created_at: agora,
    };

    setObservacoesAuditoria(prev => [auditAlteracao, ...prev]);
  };

  const deleteObservacaoAluno = async (obsId: string): Promise<void> => {
    const registroCompleto = observacoesAluno.find(o => o.id === obsId);
    if (!registroCompleto) return;

    const agora = new Date().toISOString();
    const estudanteId = registroCompleto.estudante_id || registroCompleto.aluno_id;
    const conteudoTexto = registroCompleto.texto_completo || registroCompleto.texto || '';
    const categoria = registroCompleto.categoria || registroCompleto.tipo || 'geral';

    // 1. Remove da listagem ativa com estado otimista e persiste no localStorage
    setObservacoesAluno(prev => {
      const filtradas = prev.filter(o => o.id !== obsId);
      try {
        localStorage.setItem('school_os_observacoes_aluno', JSON.stringify(filtradas));
      } catch {}
      return filtradas;
    });

    // 2. Preserva na auditoria local imediatamente com todos os campos necessários
    const tempAuditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const auditDelete: ObservacaoAuditoria = {
      id: tempAuditId,
      observacao_id: obsId,
      estudante_id: estudanteId,
      evento: 'DELETE',
      acao: 'EXCLUSAO',
      conteudo_observacao: conteudoTexto,
      texto_anterior: conteudoTexto,
      categoria: categoria,
      registro_anterior: registroCompleto,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      excluido_por_usuario_id: currentUser.id,
      excluido_por_usuario_nome: currentUser.name,
      data_exclusao: agora,
      created_at: agora,
    };
    setObservacoesAuditoria(prev => {
      const novas = [auditDelete, ...prev];
      try {
        localStorage.setItem('school_os_observacoes_auditoria', JSON.stringify(novas));
      } catch {}
      return novas;
    });

    try {
      const res = await fetch(`/api/observacoes?id=${encodeURIComponent(obsId)}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          id: obsId,
          observacao_id: obsId,
          estudante_id: estudanteId,
          registro_completo: registroCompleto,
          usuario_id: currentUser.id,
          usuario_nome: currentUser.name,
          excluido_por_usuario_id: currentUser.id,
          excluido_por_usuario_nome: currentUser.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn("Aviso na exclusão direta, acionando fallback de sincronização:", data.error);
        // Tenta fallback via rota de sync
        const syncRes = await fetch('/api/turso/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_observacao',
            payload: {
              observacao_id: obsId,
              estudante_id: estudanteId,
              usuario_id: currentUser.id,
              usuario_nome: currentUser.name,
              registro_completo: registroCompleto,
            },
          }),
        });

        if (!syncRes.ok) {
          console.error('Falha no fallback de sincronização da exclusão');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.auditRecord) {
          // Atualiza a auditoria com o registro real persistido no Turso
          setObservacoesAuditoria(prev => {
            const atualizadas = [
              data.auditRecord,
              ...prev.filter(a => a.id !== tempAuditId && a.observacao_id !== obsId),
            ];
            try {
              localStorage.setItem('school_os_observacoes_auditoria', JSON.stringify(atualizadas));
            } catch {}
            return atualizadas;
          });
        }
      }

      // Atualiza também os logs globais de atividade se aplicável
      try {
        await refreshActivityLogs();
      } catch {}
    } catch (apiErr: any) {
      console.warn('Erro ao processar exclusão atômica:', apiErr);
      try {
        await fetch('/api/turso/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_observacao',
            payload: {
              observacao_id: obsId,
              estudante_id: estudanteId,
              usuario_id: currentUser.id,
              usuario_nome: currentUser.name,
              registro_completo: registroCompleto,
            },
          }),
        });
      } catch (syncErr) {
        console.error('Erro no fallback de sincronização da exclusão:', syncErr);
      }
    }
  };

  // 7. Repositório Google Drive
  const addDocumentoEstudanteDrive = (doc: DocumentoEstudanteDrive) => {
    const docCompleto: DocumentoEstudanteDrive = {
      ...doc,
      id: doc.id || `doc-drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      data_upload: doc.data_upload || new Date().toISOString(),
    };
    setDocumentosEstudanteDrive(prev => [docCompleto, ...prev]);
  };

  const deleteDocumentoEstudanteDrive = async (
    id: string,
    fileId?: string,
    nomeArquivo?: string,
    estudanteId?: string
  ): Promise<void> => {
    // Busca o documento completo no estado se disponível
    const doc = documentosEstudanteDrive.find(d => d.id === id || (fileId && d.drive_file_id === fileId));
    const resolvedFileId = fileId || doc?.drive_file_id || (id.startsWith('doc-') ? undefined : id);
    const resolvedNomeArquivo = nomeArquivo || doc?.nome_arquivo || '';
    const resolvedEstudanteId = estudanteId || doc?.aluno_id || '';

    // 1. Remove da listagem local imediatamente (otimista)
    setDocumentosEstudanteDrive(prev => {
      const filtrados = prev.filter(d =>
        d.id !== id &&
        (!resolvedFileId || d.drive_file_id !== resolvedFileId) &&
        (!resolvedNomeArquivo || d.nome_arquivo?.toLowerCase().trim() !== resolvedNomeArquivo.toLowerCase().trim())
      );
      try {
        localStorage.setItem('school_os_documentos_drive', JSON.stringify(filtrados));
      } catch {}
      return filtrados;
    });

    // Se o arquivo for foto de perfil do estudante, limpa foto_url no cadastro do estudante
    const isFoto =
      resolvedNomeArquivo.toLowerCase().includes('foto_perfil_3x4') ||
      resolvedNomeArquivo.toLowerCase().startsWith('[foto') ||
      resolvedNomeArquivo.toLowerCase().includes('foto_3x4') ||
      (doc?.tipo === 'outro' && resolvedNomeArquivo.toLowerCase().includes('foto'));

    // Atualiza o estudante na memória e localStorage para remover também de estudante.documentos
    if (resolvedEstudanteId) {
      setEstudantes(prev => {
        const atualizados = prev.map(est => {
          if (est.id === resolvedEstudanteId) {
            const docsFiltrados = (est.documentos || []).filter(
              d =>
                d.id !== id &&
                (!resolvedFileId || d.drive_file_id !== resolvedFileId) &&
                (!resolvedNomeArquivo || d.nome_arquivo?.toLowerCase().trim() !== resolvedNomeArquivo.toLowerCase().trim())
            );
            const atualizado: any = { ...est, documentos: docsFiltrados };
            if (isFoto) {
              atualizado.foto_url = undefined;
            }
            return atualizado;
          }
          return est;
        });
        try {
          localStorage.setItem('school_os_estudantes', JSON.stringify(atualizados));
        } catch {}
        return atualizados;
      });
    }

    // 2. Chama a API de exclusão física no Google Drive com auditoria e limpeza no banco local
    try {
      const res = await fetch('/api/upload-drive', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          id,
          docId: id,
          fileId: resolvedFileId,
          drive_file_id: resolvedFileId,
          nomeArquivo: resolvedNomeArquivo,
          estudanteId: resolvedEstudanteId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro ao excluir arquivo no servidor (${res.status})`);
      }

      try {
        await refreshActivityLogs();
      } catch {}
    } catch (err: any) {
      console.warn('Aviso ao sincronizar exclusão do Google Drive com o servidor:', err);
      throw err;
    }
  };

  // 8. Gestão de Atestados dos Professores
  const addAtestadoProfessor = (atestado: Omit<AtestadoProfessor, 'id' | 'data_upload' | 'permite_exclusao'>) => {
    const novoAtestado: AtestadoProfessor = {
      ...atestado,
      id: `atest-${Date.now()}`,
      data_upload: new Date().toISOString().split('T')[0],
      permite_exclusao: true,
    };

    setAtestadosProfessor(prev => [novoAtestado, ...prev]);

    // Registra automaticamente falta e reposição devida com a regra dos 30 dias
    const dataLimite = new Date(new Date(atestado.data_inicio).getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const novaReposicao: ReposicaoAula = {
      id: `rep-${Date.now()}`,
      professor_id: atestado.professor_id,
      data_falta: atestado.data_inicio,
      qtd_aulas_faltantes: atestado.dias_afastamento * 2,
      data_limite_reposicao: dataLimite,
      status: 'Pendente',
      created_at: new Date().toISOString(),
    };

    setReposicoesAulas(prev => [novaReposicao, ...prev]);
  };

  const deleteAtestadoProfessor = (id: string) => {
    setAtestadosProfessor(prev => prev.filter(a => a.id !== id));
  };

  const aprovarAtestadoProfessor = (id: string, aprovar?: boolean) => {
    setAtestadosProfessor(prev =>
      prev.map(a => (a.id === id ? { ...a, status: aprovar !== false ? 'Aprovado' : 'Pendente' } : a))
    );
  };

  // 8.1 Débito & Reposição de Aulas (Regra dos 30 Dias)
  const registrarReposicaoAula = (reposicaoId: string, dados: { data_execucao: string; horario: string; conteudo: string }) => {
    setReposicoesAulas(prev =>
      prev.map(r => {
        if (r.id === reposicaoId) {
          return {
            ...r,
            data_execucao_reposicao: dados.data_execucao,
            horario_reposicao: dados.horario,
            conteudo_lecionado: dados.conteudo,
          };
        }
        return r;
      })
    );
  };

  const homologarReposicaoAula = (reposicaoId: string, homologarOuStatus?: boolean | string) => {
    setReposicoesAulas(prev =>
      prev.map(r => {
        if (r.id === reposicaoId) {
          if (typeof homologarOuStatus === 'boolean') {
            return {
              ...r,
              status: homologarOuStatus ? 'Reposta' : 'Pendente',
              homologado_por_admin: homologarOuStatus,
            };
          }
          if (typeof homologarOuStatus === 'string') {
            return {
              ...r,
              status: homologarOuStatus as StatusReposicaoAula,
              homologado_por_admin: homologarOuStatus === 'Reposta' || homologarOuStatus === 'reposta',
            };
          }
          return { ...r, status: 'Reposta', homologado_por_admin: true };
        }
        return r;
      })
    );
  };

  const deleteReposicaoAula = (id: string) => {
    setReposicoesAulas(prev => prev.filter(r => r.id !== id));
  };

  const addFaltaComReposicao = (dados: {
    professorId: string;
    professorNome: string;
    dataFalta: string;
    aulasFaltadas: number;
    justificativa: string;
    turmaId?: string;
  }) => {
    const novaFalta: FaltaProfessor = {
      id: `falta-${Date.now()}`,
      professor_id: dados.professorId,
      professor_nome: dados.professorNome,
      data_falta: dados.dataFalta,
      aulas_faltadas: dados.aulasFaltadas,
      justificativa: dados.justificativa,
      homologado: false,
      created_at: new Date().toISOString(),
    };

    setFaltasProfessores(prev => [novaFalta, ...prev]);

    const dataLimite = new Date(new Date(dados.dataFalta).getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const novaReposicao: ReposicaoAula = {
      id: `rep-${Date.now()}`,
      professor_id: dados.professorId,
      data_falta: dados.dataFalta,
      qtd_aulas_faltantes: dados.aulasFaltadas,
      data_limite_reposicao: dataLimite,
      turma_id: dados.turmaId,
      status: 'Pendente',
      created_at: new Date().toISOString(),
    };

    setReposicoesAulas(prev => [novaReposicao, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        role,
        setRole,
        escolaConfig,
        updateEscolaConfig,
        sidebarCollapsed,
        toggleSidebarCollapsed,
        setSidebarCollapsed,
        users,
        currentUser,
        setCurrentUser,
        authenticatedUser,
        setAuthenticatedUser,
        isAdminSession,
        isAuthenticated,
        isInitialized,
        logout,
        addUser,
        updateUser,
        resetUserPassword,
        changePassword,
        deleteUser,
        turmas,
        estudantes,
        professores,
        faltasProfessores,
        eventos,
        activityLogs,
        solicitacoesRelatorio,
        relatoriosProfessores,
        relatoriosConsolidados,
        notificacoesAdmin,
        addSolicitacaoRelatorio,
        salvarRascunhoProfessor,
        updateRelatorioProfessor,
        deleteRelatorioProfessor,
        polirRelatorioComIA,
        enviarRelatorioProfessor,
        marcarNotificacaoLida,
        marcarNotificacaoComoLida: marcarNotificacaoLida,
        marcarTodasNotificacoesLidas,
        consolidarRelatorioComIA,
        salvarRelatorioConsolidado,
        excluirSolicitacaoRelatorio,
        observacoesAluno,
        observacoesAuditoria,
        addObservacaoAluno,
        updateObservacaoAluno,
        deleteObservacaoAluno,
        documentosEstudanteDrive,
        addDocumentoEstudanteDrive,
        deleteDocumentoEstudanteDrive,
        atestadosProfessor,
        addAtestadoProfessor,
        deleteAtestadoProfessor,
        aprovarAtestadoProfessor,
        reposicoesAulas,
        registrarReposicaoAula,
        homologarReposicaoAula,
        deleteReposicaoAula,
        addFaltaComReposicao,
        addEstudante,
        updateEstudante,
        deleteEstudante,
        addDocumentoToEstudante,
        addTurma,
        updateTurma,
        toggleStatusTurma,
        migrarEstudantes,
        addActivityLog,
        refreshActivityLogs,
        addProfessor,
        updateProfessor,
        toggleProfessorApoio,
        addFaltaProfessor,
        toggleHomologarFalta,
        addEvento,
        deleteEvento,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
}
