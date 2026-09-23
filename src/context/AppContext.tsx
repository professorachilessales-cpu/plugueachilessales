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
  AllowedModule
} from '@/lib/types';
import { 
  initialEscolaConfig, 
  initialTurmas, 
  initialEstudantes, 
  initialProfessores, 
  initialFaltasProfessores, 
  initialEventos,
  initialActivityLogs,
  initialUsers
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
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [currentUser, setCurrentUserState] = useState<SystemUser>(initialUsers[0]);
  const [isInitialized, setIsInitialized] = useState(false);

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
      let loadedUsers = initialUsers;
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          const validModules: AllowedModule[] = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'];
          loadedUsers = parsed.map((u: SystemUser) => {
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
            return {
              ...u,
              allowed_modules: cleanMods,
            };
          });
          setUsers(loadedUsers);
          localStorage.setItem('school_os_users', JSON.stringify(loadedUsers));
        } catch (e) {
          console.error('Falha ao ler school_os_users:', e);
        }
      }

      // Usuário Atual
      const savedCurrentUserId = localStorage.getItem('school_os_current_user_id');
      if (savedCurrentUserId) {
        const found = loadedUsers.find(u => u.id === savedCurrentUserId);
        if (found) {
          setCurrentUserState(found);
          setRoleState(found.role);
        }
      }

      // Tema
      const savedTheme = localStorage.getItem('school_os_theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      setThemeState(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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

      // Estudantes persistidos
      const savedEstudantes = localStorage.getItem('school_os_estudantes');
      if (savedEstudantes) {
        setEstudantes(JSON.parse(savedEstudantes));
      }

      // Turmas persistidas
      const savedTurmas = localStorage.getItem('school_os_turmas');
      if (savedTurmas) {
        try {
          const parsedTurmas: Turma[] = JSON.parse(savedTurmas);
          const sanitizedTurmas = parsedTurmas.map((t) => ({
            ...t,
            professores_ids: t.professores_ids || (t.professor_regente_id ? [t.professor_regente_id] : []),
            equipe_apoio_ids: t.equipe_apoio_ids || [],
          }));
          setTurmas(sanitizedTurmas);
        } catch (e) {
          console.error('Falha ao ler school_os_turmas:', e);
        }
      }

      // Professores persistidos
      const savedProfessores = localStorage.getItem('school_os_professores');
      if (savedProfessores) {
        try {
          const parsedProfessores: Professor[] = JSON.parse(savedProfessores);
          const sanitizedProfessores = parsedProfessores.map((p) => ({
            ...p,
            ativo: p.ativo !== false,
          }));
          const hasProf5 = sanitizedProfessores.some((p) => p.id === 'prof-5');
          const finalProfessores = hasProf5 
            ? sanitizedProfessores 
            : [...sanitizedProfessores, ...initialProfessores.filter((ip) => ip.id === 'prof-5')];
          setProfessores(finalProfessores);
        } catch (e) {
          console.error('Falha ao ler school_os_professores:', e);
        }
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
            setUsers(tUsers);
            localStorage.setItem('school_os_users', JSON.stringify(tUsers));
            const savedId = localStorage.getItem('school_os_current_user_id');
            const found = tUsers.find((u: SystemUser) => u.id === savedId) || tUsers[0];
            setCurrentUserState(found);
            setRoleState(found.role);
          }
          if (tProf && tProf.length > 0) {
            setProfessores(tProf);
            localStorage.setItem('school_os_professores', JSON.stringify(tProf));
          }
          if (tTurmas && tTurmas.length > 0) {
            setTurmas(tTurmas);
            localStorage.setItem('school_os_turmas', JSON.stringify(tTurmas));
          }
          if (tEst && tEst.length > 0) {
            setEstudantes(tEst);
            localStorage.setItem('school_os_estudantes', JSON.stringify(tEst));
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
        }
      })
      .catch((err) => {
        console.warn('Usando dados em cache local devido à indisponibilidade momentânea do Turso:', err);
      });
  }, []);

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

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    localStorage.setItem('school_os_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    setCurrentUserState(user);
    setRoleState(user.role);
    localStorage.setItem('school_os_current_user_id', user.id);
    localStorage.setItem('school_os_role', user.role);
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('school_os_role', newRole);
    // Sincroniza currentUser para um usuário com essa role
    const matchingUser = users.find((u) => u.role === newRole && u.is_active);
    if (matchingUser) {
      setCurrentUserState(matchingUser);
      localStorage.setItem('school_os_current_user_id', matchingUser.id);
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
