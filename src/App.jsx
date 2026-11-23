
import React, { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import {
  Heart, Users, Stethoscope, ArrowRight, ShieldCheck,
  Activity, ClipboardList, LogOut, Menu, X, Sparkles,
  CalendarDays, HandHeart, Copy, Link2, Search,
  Eye, Check, ArrowLeft, RefreshCw, UserRound
} from 'lucide-react';

const roles = {
  patient: {
    label: 'Doente',
    icon: Heart,
    intro: 'O seu espaço de acompanhamento e bem-estar.'
  },
  caregiver: {
    label: 'Cuidador',
    icon: HandHeart,
    intro: 'O seu bem-estar também merece cuidado.'
  },
  professional: {
    label: 'Profissional de saúde',
    icon: Stethoscope,
    intro: 'Acompanhe necessidades e coordene cuidados.'
  }
};

function formatDate(value) {
  if (!value) return 'Data não disponível';

  return new Date(value).toLocaleString('pt-PT', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function formatAnswer(value) {
  if (value === null || value === undefined || value === '') {
    return 'Não preenchido';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Nenhuma opção selecionada';
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => {
        const label = {
          pain: 'Dor',
          fatigue: 'Cansaço',
          breathlessness: 'Falta de ar',
          mood: 'Estado emocional',
          notes: 'Observações',
          wellbeing: 'Bem-estar',
          difficulties: 'Dificuldades',
          needs: 'Necessidades'
        }[key] || key;

        return `${label}: ${formatAnswer(item)}`;
      })
      .join('\n');
  }

  return String(value);
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('home');
  const [role, setRole] = useState('patient');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [entries, setEntries] = useState([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient'
  });

  const [assessment, setAssessment] = useState({
    pain: 0,
    fatigue: 0,
    breathlessness: 0,
    mood: 'Tranquilo/a',
    notes: ''
  });

  const [care, setCare] = useState({
    wellbeing: 'Razoável',
    difficulties: [],
    needs: [],
    notes: ''
  });

  const [note, setNote] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [associationBusy, setAssociationBusy] = useState(false);

  // Área dos profissionais
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEntries, setPatientEntries] = useState([]);
  const [viewedEntries, setViewedEntries] = useState({});
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [viewingBusy, setViewingBusy] = useState(null);

  // Área do cuidador
  const [caregiverPatient, setCaregiverPatient] = useState(null);
  const [loadingCaregiverPatient, setLoadingCaregiverPatient] = useState(false);

  // Verificar sessão
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession) {
        setPage('dashboard');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === 'SIGNED_IN' && currentSession) {
          setPage('dashboard');
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setEntries([]);
          setPatients([]);
          setCaregiverPatient(null);
          setSelectedPatient(null);
          setPatientEntries([]);
          setViewedEntries({});
          setPage('home');
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Carregar perfil sempre que a sessão mudar
  useEffect(() => {
    if (!session || !supabase) {
      setProfile(null);
      return;
    }

    loadProfile();
  }, [session]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, association_code, professional_specialty')
      .eq('id', session.user.id)
      .single();

    if (error) {
      setMessage('Não foi possível carregar o perfil: ' + error.message);
      return;
    }

    setProfile(data);

    if (data?.role === 'professional') {
      loadPatients();
    } else if (data?.role === 'caregiver') {
      loadEntries();
      loadCaregiverPatient();
    } else if (data?.role === 'patient') {
      loadEntries();
    }
  }

  // Carregar os registos do próprio utilizador
  async function loadEntries() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error) {
      setEntries(data || []);
    } else {
      setMessage('Não foi possível carregar os registos: ' + error.message);
    }
  }

  // Carregar o único doente associado ao cuidador
  async function loadCaregiverPatient() {
    if (!session) return;

    setLoadingCaregiverPatient(true);

    const { data: link, error: linkError } = await supabase
      .from('patient_team_members')
      .select('patient_id')
      .eq('member_id', session.user.id)
      .eq('member_role', 'caregiver')
      .maybeSingle();

    if (linkError) {
      setMessage('Não foi possível carregar a associação: ' + linkError.message);
      setCaregiverPatient(null);
      setLoadingCaregiverPatient(false);
      return;
    }

    if (!link) {
      setCaregiverPatient(null);
      setLoadingCaregiverPatient(false);
      return;
    }

    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('id, full_name, association_code')
      .eq('id', link.patient_id)
      .single();

    if (patientError) {
      setMessage('Não foi possível carregar o doente associado: ' + patientError.message);
      setCaregiverPatient(null);
      setLoadingCaregiverPatient(false);
      return;
    }

    setCaregiverPatient(patient);
    setLoadingCaregiverPatient(false);
  }

  // Carregar todos os doentes associados ao profissional
  async function loadPatients() {
    if (!session) return;

    setLoadingPatients(true);

    const { data: links, error: linksError } = await supabase
      .from('patient_team_members')
      .select('patient_id')
      .eq('member_id', session.user.id)
      .eq('member_role', 'professional');

    if (linksError) {
      setMessage('Não foi possível carregar os doentes: ' + linksError.message);
      setLoadingPatients(false);
      return;
    }

    const patientIds = [...new Set((links || []).map(item => item.patient_id))];

    if (!patientIds.length) {
      setPatients([]);
      setSelectedPatient(null);
      setPatientEntries([]);
      setLoadingPatients(false);
      return;
    }

    const { data: patientProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, association_code')
      .in('id', patientIds)
      .order('full_name', { ascending: true });

    if (profilesError) {
      setMessage('Não foi possível carregar os perfis: ' + profilesError.message);
      setLoadingPatients(false);
      return;
    }

    setPatients(patientProfiles || []);
    setLoadingPatients(false);
  }

  // Abrir perfil do doente e carregar registos do doente e de todos os cuidadores
  async function openPatient(patient) {
    setSelectedPatient(patient);
    setPatientEntries([]);
    setViewedEntries({});
    setLoadingRecords(true);
    setMessage('');

    const { data: team, error: teamError } = await supabase
      .from('patient_team_members')
      .select('member_id')
      .eq('patient_id', patient.id)
      .eq('member_role', 'caregiver');

    if (teamError) {
      setMessage('Não foi possível carregar os cuidadores associados: ' + teamError.message);
      setLoadingRecords(false);
      return;
    }

    const caregiverIds = (team || []).map(item => item.member_id);
    const userIds = [patient.id, ...caregiverIds];

    const { data: records, error: recordsError } = await supabase
      .from('check_ins')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (recordsError) {
      setMessage('Não foi possível carregar os registos: ' + recordsError.message);
      setLoadingRecords(false);
      return;
    }

    const allRecords = records || [];
    setPatientEntries(allRecords);

    if (allRecords.length) {
      const recordIds = allRecords.map(item => item.id);

      const { data: views, error: viewsError } = await supabase
        .from('check_in_views')
        .select('check_in_id, viewed_at, professional_id')
        .in('check_in_id', recordIds)
        .eq('professional_id', session.user.id);

      if (viewsError) {
        setMessage('Os registos foram carregados, mas não foi possível consultar as visualizações: ' + viewsError.message);
      } else {
        const viewMap = {};

        (views || []).forEach(item => {
          viewMap[item.check_in_id] = item.viewed_at;
        });

        setViewedEntries(viewMap);
      }
    }

    setLoadingRecords(false);
  }

  // Marcar um registo como visualizado
  async function markAsViewed(recordId) {
    setViewingBusy(recordId);
    setMessage('');

    const { error } = await supabase
      .from('check_in_views')
      .insert({
        check_in_id: recordId,
        professional_id: session.user.id
      });

    setViewingBusy(null);

    if (error) {
      if (error.code === '23505') {
        setMessage('Este registo já foi marcado como visualizado.');
        openPatient(selectedPatient);
        return;
      }

      setMessage('Não foi possível guardar a visualização: ' + error.message);
      return;
    }

    setViewedEntries(previous => ({
      ...previous,
      [recordId]: new Date().toISOString()
    }));

    setMessage('Registo marcado como visualizado.');
  }

  async function signUp(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          requested_role: form.role
        }
      }
    });

    setBusy(false);

    setMessage(
      error
        ? error.message
        : 'Conta criada. Verifique o seu email para confirmar o registo.'
    );
  }

  // Iniciar sessão
  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSession(data.session);
    setPage('dashboard');
    setMessage('');
  }

  // Associar profissional ou cuidador através do código do doente
  async function joinPatient(e) {
    e.preventDefault();

    if (!joinCode.trim()) {
      setMessage('Introduza o código de associação do doente.');
      return;
    }

    setAssociationBusy(true);
    setMessage('');

    const { error } = await supabase.rpc('join_patient_by_code', {
      p_code: joinCode.trim().toUpperCase()
    });

    setAssociationBusy(false);

    if (error) {
      setMessage('Não foi possível fazer a associação: ' + error.message);
      return;
    }

    setJoinCode('');
    setMessage('Associação realizada com sucesso!');

    if (profile.role === 'professional') {
      await loadPatients();
    } else if (profile.role === 'caregiver') {
      await loadCaregiverPatient();
    }
  }

  async function saveCheckIn(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const payload = profile.role === 'patient'
      ? { kind: 'patient', answers: assessment }
      : { kind: 'caregiver', answers: care };

    const { error } = await supabase
      .from('check_ins')
      .insert({
        user_id: session.user.id,
        ...payload
      });

    setBusy(false);

    setMessage(
      error ? error.message : 'Registo guardado com sucesso.'
    );

    if (!error) {
      setAssessment({
        pain: 0,
        fatigue: 0,
        breathlessness: 0,
        mood: 'Tranquilo/a',
        notes: ''
      });

      setCare({
        wellbeing: 'Razoável',
        difficulties: [],
        needs: [],
        notes: ''
      });

      loadEntries();
    }
  }

  async function saveProfessionalNote(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { error } = await supabase
      .from('professional_notes')
      .insert({
        author_id: session.user.id,
        note
      });

    setBusy(false);

    setMessage(error ? error.message : 'Nota guardada.');

    if (!error) {
      setNote('');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setEntries([]);
    setPatients([]);
    setCaregiverPatient(null);
    setSelectedPatient(null);
    setPatientEntries([]);
    setViewedEntries({});
    setPage('home');
    setMessage('');
  }

  const go = (p) => {
    setPage(p);
    setMessage('');
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const configured = supabaseConfigured;

  const filteredPatients = patients.filter(patient =>
    (patient.full_name || '')
      .toLowerCase()
      .includes(patientSearch.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            go(session ? 'dashboard' : 'home');
          }}
        >
          <span className="brand-mark"><Heart size={21}/></span>
          <span>PallBridge <b>360</b></span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="Abrir menu"
        >
          {mobileMenu ? <X/> : <Menu/>}
        </button>

        <nav className={mobileMenu ? 'nav open' : 'nav'}>
          <a
            href="#how"
            onClick={e => {
              e.preventDefault();
              go('home');
              setTimeout(
                () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }),
                50
              );
            }}
          >
            Como funciona
          </a>

          <a
            href="#about"
            onClick={e => {
              e.preventDefault();
              go('home');
              setTimeout(
                () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }),
                50
              );
            }}
          >
            Sobre
          </a>

          {session ? (
            <button className="button small" onClick={() => go('dashboard')}>
              A minha área
            </button>
          ) : (
            <button className="button small" onClick={() => go('login')}>
              Entrar
            </button>
          )}
        </nav>
      </header>

      {!configured && (
        <div className="setup-banner">
          <ShieldCheck size={17}/>
          Para ativar contas e guardar dados, liga o projeto a uma base de dados Supabase.
        </div>
      )}

      {page === 'home' && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={14}/> Cuidado contínuo e integrado
              </span>

              <h1>
                Cuidar é estar presente. <em>Em todas as dimensões.</em>
              </h1>

              <p>
                Uma plataforma que aproxima pessoas, cuidadores e profissionais de saúde,
                promovendo um acompanhamento mais próximo, contínuo e centrado nas necessidades de cada pessoa.
              </p>

              <button className="button" onClick={() => go('register')}>
                Começar agora <ArrowRight size={17}/>
              </button>

              <div className="hero-proof">
                <span><ShieldCheck size={16}/> Cuidado centrado na pessoa</span>
                <span><Users size={16}/> Trabalho em equipa</span>
              </div>
            </div>

            <div className="hero-art">
              <div className="art-orb orb-one"></div>
              <div className="art-orb orb-two"></div>

              <div className="art-card">
                <div className="art-people">
                  <span>👵🏻</span><span>👩🏻</span><span>🧑🏻‍⚕️</span>
                </div>

                <div className="art-labels">
                  <b>Doente</b><b>Cuidador</b><b>Profissional de saúde</b>
                </div>

                <div className="art-message">
                  <Heart size={17} fill="currentColor"/>
                  Cuidar em conjunto faz a diferença
                </div>
              </div>

              <div className="float-pill pill-a">♡ Bem-estar</div>
              <div className="float-pill pill-b">✧ Acompanhamento</div>
            </div>
          </section>

          <section className="section" id="access">
            <div className="section-heading">
              <span className="eyebrow">A sua área</span>
              <h2>Uma plataforma, três perspetivas.</h2>
              <p>Escolha o seu perfil para conhecer as funcionalidades.</p>
            </div>

            <div className="role-grid">
              {Object.entries(roles).map(([key, r]) => {
                const Icon = r.icon;

                return (
                  <article className="role-card" key={key}>
                    <div className="role-icon"><Icon size={25}/></div>
                    <h3>Sou {r.label.toLowerCase()}</h3>
                    <p>{r.intro}</p>

                    <button
                      className="text-button"
                      onClick={() => {
                        setRole(key);
                        setForm({ ...form, role: key });
                        go('login');
                      }}
                    >
                      Entrar nesta área <ArrowRight size={16}/>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="section how-section" id="how">
            <div className="section-heading">
              <span className="eyebrow">Como funciona</span>
              <h2>Da partilha à ação.</h2>
              <p>Uma ligação entre quem recebe, quem cuida e quem acompanha.</p>
            </div>

            <div className="steps">
              <div>
                <span>01</span><h3>Partilhar</h3>
                <p>Doentes e cuidadores registam o seu estado, preocupações e necessidades.</p>
              </div>
              <div>
                <span>02</span><h3>Acompanhar</h3>
                <p>A informação permite acompanhar a evolução ao longo do tempo.</p>
              </div>
              <div>
                <span>03</span><h3>Agir em conjunto</h3>
                <p>A equipa pode identificar prioridades e coordenar respostas de apoio.</p>
              </div>
            </div>
          </section>

          <section className="about" id="about">
            <div>
              <span className="eyebrow">PallBridge 360</span>
              <h2>O cuidado vê a pessoa por inteiro.</h2>
              <p>
                Valorizamos as dimensões física, psicológica, social e espiritual,
                promovendo comunicação e continuidade dos cuidados.
              </p>
            </div>

            <div className="about-symbol">
              <Heart size={50}/><span>360°</span>
            </div>
          </section>
        </main>
      )}

      {(page === 'login' || page === 'register') && (
        <main className="auth-wrap">
          <div className="auth-card">
            <button className="back" onClick={() => go('home')}>
              ← Voltar à página inicial
            </button>

            <span className="eyebrow">Área pessoal · {roles[role].label}</span>

            <h2>
              {page === 'login' ? 'Bem-vindo/a de volta.' : 'Criar conta PallBridge 360'}
            </h2>

            <p className="muted">
              {page === 'login'
                ? 'Entre para aceder ao seu espaço de acompanhamento.'
                : 'Preencha os seus dados para solicitar acesso.'}
            </p>

            <form onSubmit={page === 'login' ? signIn : signUp}>
              {page === 'register' && (
                <label>
                  Nome completo
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="O seu nome"
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="nome@email.com"
                />
              </label>

              <label>
                Palavra-passe
                <input
                  type="password"
                  minLength="8"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo de 8 caracteres"
                />
              </label>

              {page === 'register' && (
                <label>
                  Perfil
                  <select
                    value={form.role}
                    onChange={e => {
                      setForm({ ...form, role: e.target.value });
                      setRole(e.target.value);
                    }}
                  >
                    <option value="patient">Doente</option>
                    <option value="caregiver">Cuidador</option>
                    <option value="professional">Profissional de saúde</option>
                  </select>
                </label>
              )}

              <button className="button full" disabled={busy || !configured}>
                {busy ? 'A processar…' : page === 'login' ? 'Iniciar sessão' : 'Criar conta'}
                <ArrowRight size={17}/>
              </button>
            </form>

            {!configured && (
              <p className="inline-warning">
                A autenticação ficará disponível depois de configurar as credenciais do Supabase.
              </p>
            )}

            {message && <p className="feedback">{message}</p>}

            <p className="switch-auth">
              {page === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}
              {' '}
              <button onClick={() => go(page === 'login' ? 'register' : 'login')}>
                {page === 'login' ? 'Criar conta' : 'Iniciar sessão'}
              </button>
            </p>

            <p className="fine-print">
              Não introduza informação clínica real nesta versão antes da validação de segurança e privacidade.
            </p>
          </div>
        </main>
      )}

      {page === 'dashboard' && (
        <main className="dashboard-wrap">
          <div className="dashboard">
            {!session || !profile ? (
              <div className="auth-card">
                <h2>A carregar a sua área...</h2>
                <p className="muted">
                  {session ? 'Estamos a carregar o seu perfil.' : 'Inicie sessão para continuar.'}
                </p>

                {!session && (
                  <button className="button" onClick={() => go('login')}>
                    Entrar
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="dash-top">
                  <div>
                    <span className="eyebrow">
                      {roles[profile.role]?.label || 'Utilizador'}
                    </span>

                    <h2>
                      Olá, {profile.full_name || session.user.email?.split('@')[0]}.
                    </h2>

                    <p>{roles[profile.role]?.intro}</p>

                    {profile.role === 'professional' && profile.professional_specialty && (
                      <p className="muted">
                        Área profissional: {profile.professional_specialty}
                      </p>
                    )}
                  </div>

                  <button className="button secondary" onClick={signOut}>
                    <LogOut size={16}/> Terminar sessão
                  </button>
                </div>

                {/* ÁREA DO DOENTE */}
                {profile.role === 'patient' && (
                  <>
                    <div className="notice">
                      <Heart size={18}/>
                      O seu espaço de acompanhamento. Partilhe como se sente e indique aquilo de que precisa.
                    </div>

                    <div className="content-card">
                      <h3><Link2 size={19}/> O seu código de associação</h3>

                      <p>
                        Partilhe este código com os profissionais de saúde e com os cuidadores
                        que fazem parte da sua equipa de acompanhamento.
                      </p>

                      {profile.association_code ? (
                        <div className="association-code">
                          <strong>{profile.association_code}</strong>
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(profile.association_code);
                              setMessage('Código copiado.');
                            }}
                          >
                            <Copy size={16}/> Copiar código
                          </button>
                        </div>
                      ) : (
                        <p className="muted">
                          O código ainda não está disponível. Verifique se o perfil tem um código atribuído no Supabase.
                        </p>
                      )}

                      <p className="fine-print">
                        Este código serve apenas para associar contas nesta versão de demonstração.
                      </p>
                    </div>

                    <div className="content-card">
                      <h3><Activity size={19}/> Registar bem-estar</h3>

                      <form onSubmit={saveCheckIn}>
                        <div className="range-grid">
                          {[
                            ['Dor', 'pain'],
                            ['Cansaço', 'fatigue'],
                            ['Falta de ar', 'breathlessness']
                          ].map(([label, key]) => (
                            <label key={key}>
                              {label}
                              <div className="range-line">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={assessment[key]}
                                  onChange={e => setAssessment({
                                    ...assessment,
                                    [key]: Number(e.target.value)
                                  })}
                                />
                                <b>{assessment[key]}/10</b>
                              </div>
                            </label>
                          ))}
                        </div>

                        <label>
                          Como se sente emocionalmente?
                          <select
                            value={assessment.mood}
                            onChange={e => setAssessment({
                              ...assessment,
                              mood: e.target.value
                            })}
                          >
                            {['Tranquilo/a', 'Ansioso/a', 'Triste', 'Com medo', 'Preocupado/a'].map(x => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Quer acrescentar alguma coisa?
                          <textarea
                            rows="3"
                            value={assessment.notes}
                            onChange={e => setAssessment({
                              ...assessment,
                              notes: e.target.value
                            })}
                            placeholder="Escreva aqui…"
                          />
                        </label>

                        <button className="button" disabled={busy}>
                          Guardar avaliação
                        </button>
                      </form>
                    </div>
                  </>
                )}

                {/* ÁREA DO CUIDADOR */}
                {profile.role === 'caregiver' && (
                  <>
                    <div className="notice">
                      <HandHeart size={18}/>
                      Cuidar de alguém também exige cuidado consigo. Este espaço é seu.
                    </div>

                    <div className="content-card">
                      <h3><Users size={19}/> Doente associado</h3>

                      {loadingCaregiverPatient ? (
                        <p className="muted">A carregar o doente associado...</p>
                      ) : caregiverPatient ? (
                        <>
                          <p>Está associado ao seguinte doente:</p>

                          <div style={{
                            display:'flex',
                            alignItems:'center',
                            gap:'12px',
                            padding:'16px',
                            border:'1px solid #e5e7eb',
                            borderRadius:'12px',
                            background:'#fff'
                          }}>
                            <UserRound size={24}/>
                            <div>
                              <strong>{caregiverPatient.full_name || 'Doente sem nome'}</strong>
                              <p className="muted" style={{margin:'4px 0 0'}}>
                                Código: {caregiverPatient.association_code || 'Não disponível'}
                              </p>
                            </div>
                          </div>

                          <p className="fine-print" style={{marginTop:'12px'}}>
                            Cada cuidador só pode estar associado a um doente. A associação não pode ser alterada nesta área.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            Ainda não está associado a nenhum doente. Introduza o código fornecido pelo doente.
                          </p>

                          <form onSubmit={joinPatient}>
                            <label>
                              Código de associação
                              <input
                                type="text"
                                maxLength="8"
                                minLength="8"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Ex.: ABCD1234"
                                required
                              />
                            </label>

                            <button className="button" disabled={associationBusy}>
                              {associationBusy ? 'A associar…' : 'Associar ao doente'}
                            </button>
                          </form>
                        </>
                      )}
                    </div>

                    <div className="content-card">
                      <h3><Heart size={19}/> Como se tem sentido?</h3>

                      <form onSubmit={saveCheckIn}>
                        <label>
                          O seu bem-estar
                          <select
                            value={care.wellbeing}
                            onChange={e => setCare({
                              ...care,
                              wellbeing: e.target.value
                            })}
                          >
                            {['Muito bom', 'Bom', 'Razoável', 'Difícil', 'Muito difícil'].map(x => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Dificuldades que sente
                          <div className="check-grid">
                            {[
                              'Cansaço físico',
                              'Desgaste emocional',
                              'Falta de tempo pessoal',
                              'Conciliar trabalho e cuidados',
                              'Falta de apoio',
                              'Falta de informação'
                            ].map(x => (
                              <label className="check" key={x}>
                                <input
                                  type="checkbox"
                                  checked={care.difficulties.includes(x)}
                                  onChange={e => setCare({
                                    ...care,
                                    difficulties: e.target.checked
                                      ? [...care.difficulties, x]
                                      : care.difficulties.filter(v => v !== x)
                                  })}
                                />
                                {x}
                              </label>
                            ))}
                          </div>
                        </label>

                        <label>
                          Que apoio lhe seria útil?
                          <textarea
                            rows="3"
                            value={care.notes}
                            onChange={e => setCare({
                              ...care,
                              notes: e.target.value
                            })}
                            placeholder="Conte-nos o que precisa…"
                          />
                        </label>

                        <button className="button" disabled={busy}>
                          Guardar registo
                        </button>
                      </form>
                    </div>
                  </>
                )}

                {/* ÁREA DO PROFISSIONAL DE SAÚDE */}
                {profile.role === 'professional' && (
                  <>
                    <div className="notice">
                      <Stethoscope size={18}/>
                      Área de acompanhamento profissional e coordenação multidisciplinar.
                    </div>

                    {!selectedPatient ? (
                      <>
                        <div className="content-card">
                          <h3><Link2 size={19}/> Associar novo doente</h3>

                          <p>
                            Introduza o código de associação de 8 caracteres fornecido pelo doente.
                            Vários profissionais podem acompanhar o mesmo doente.
                          </p>

                          <form onSubmit={joinPatient}>
                            <label>
                              Código de associação
                              <input
                                type="text"
                                maxLength="8"
                                minLength="8"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="Ex.: ABCD1234"
                                required
                              />
                            </label>

                            <button className="button" disabled={associationBusy}>
                              {associationBusy ? 'A associar…' : 'Associar doente'}
                            </button>
                          </form>
                        </div>

                        <div className="content-card">
                          <div style={{
                            display:'flex',
                            justifyContent:'space-between',
                            alignItems:'center',
                            gap:'12px',
                            flexWrap:'wrap'
                          }}>
                            <h3><Users size={19}/> Os meus doentes ({patients.length})</h3>

                            <button
                              type="button"
                              className="button secondary"
                              onClick={loadPatients}
                              disabled={loadingPatients}
                            >
                              <RefreshCw size={15}/> Atualizar
                            </button>
                          </div>

                          <label style={{display:'block',marginTop:'16px'}}>
                            <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <Search size={17}/> Pesquisar doente
                            </span>
                            <input
                              type="search"
                              value={patientSearch}
                              onChange={e => setPatientSearch(e.target.value)}
                              placeholder="Escreva o nome do doente..."
                            />
                          </label>

                          {loadingPatients ? (
                            <p className="muted">A carregar doentes...</p>
                          ) : filteredPatients.length ? (
                            <div style={{display:'grid',gap:'12px',marginTop:'18px'}}>
                              {filteredPatients.map(patient => (
                                <button
                                  type="button"
                                  key={patient.id}
                                  onClick={() => openPatient(patient)}
                                  style={{
                                    display:'flex',
                                    justifyContent:'space-between',
                                    alignItems:'center',
                                    gap:'12px',
                                    textAlign:'left',
                                    padding:'16px',
                                    border:'1px solid #e5e7eb',
                                    borderRadius:'12px',
                                    background:'#fff',
                                    color:'inherit',
                                    cursor:'pointer',
                                    width:'100%'
                                  }}
                                >
                                  <span style={{
                                    display:'flex',
                                    alignItems:'center',
                                    gap:'12px',
                                    minWidth:0
                                  }}>
                                    <span style={{
                                      width:'42px',
                                      height:'42px',
                                      borderRadius:'50%',
                                      background:'#f3e8ee',
                                      display:'flex',
                                      alignItems:'center',
                                      justifyContent:'center',
                                      flexShrink:0
                                    }}>
                                      <UserRound size={20}/>
                                    </span>

                                    <span style={{display:'grid',gap:'4px',minWidth:0}}>
                                      <strong>{patient.full_name || 'Doente sem nome'}</strong>
                                      <small style={{color:'#6b7280'}}>
                                        Código: {patient.association_code || 'Não disponível'}
                                      </small>
                                    </span>
                                  </span>

                                  <ArrowRight size={19}/>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="muted" style={{marginTop:'16px'}}>
                              {patients.length
                                ? 'Não foram encontrados doentes com esse nome.'
                                : 'Ainda não tem doentes associados. Introduza um código acima para começar.'}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="content-card">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => {
                              setSelectedPatient(null);
                              setPatientEntries([]);
                              setViewedEntries({});
                              setMessage('');
                            }}
                          >
                            <ArrowLeft size={16}/> Voltar à lista de doentes
                          </button>

                          <div style={{marginTop:'22px'}}>
                            <span className="eyebrow">Perfil do doente</span>
                            <h2 style={{marginTop:'8px'}}>{selectedPatient.full_name}</h2>
                            <p className="muted">
                              Código de associação: <strong>{selectedPatient.association_code || 'Não disponível'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="content-card">
                          <div style={{
                            display:'flex',
                            justifyContent:'space-between',
                            alignItems:'center',
                            gap:'12px',
                            flexWrap:'wrap'
                          }}>
                            <h3><ClipboardList size={19}/> Histórico de registos</h3>

                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => openPatient(selectedPatient)}
                              disabled={loadingRecords}
                            >
                              <RefreshCw size={15}/> Atualizar histórico
                            </button>
                          </div>

                          <p className="muted">
                            Consulte os registos submetidos pelo doente e pelos cuidadores associados, por ordem cronológica.
                          </p>

                          {loadingRecords ? (
                            <p className="muted">A carregar o histórico...</p>
                          ) : patientEntries.length ? (
                            <div style={{display:'grid',gap:'16px',marginTop:'18px'}}>
                              {patientEntries.map(item => {
                                const answers = item.answers || {};
                                const alreadyViewed = Boolean(viewedEntries[item.id]);

                                return (
                                  <article
                                    key={item.id}
                                    style={{
                                      border:'1px solid #e5e7eb',
                                      borderRadius:'12px',
                                      padding:'16px',
                                      background:'#fff'
                                    }}
                                  >
                                    <div style={{
                                      display:'flex',
                                      justifyContent:'space-between',
                                      alignItems:'flex-start',
                                      gap:'12px',
                                      flexWrap:'wrap'
                                    }}>
                                      <div>
                                        <strong>
                                          {item.user_id === selectedPatient.id
                                            ? (item.kind === 'patient'
                                              ? 'Avaliação de bem-estar · Doente'
                                              : 'Registo do doente')
                                            : 'Registo do cuidador'}
                                        </strong>

                                        <p className="muted" style={{margin:'6px 0 0'}}>
                                          <CalendarDays
                                            size={14}
                                            style={{
                                              display:'inline',
                                              verticalAlign:'middle',
                                              marginRight:'5px'
                                            }}
                                          />
                                          {formatDate(item.created_at)}
                                        </p>
                                      </div>

                                      {alreadyViewed ? (
                                        <span style={{
                                          display:'inline-flex',
                                          alignItems:'center',
                                          gap:'5px',
                                          color:'#15803d',
                                          fontSize:'13px',
                                          fontWeight:600
                                        }}>
                                          <Check size={16}/> Visualizado
                                        </span>
                                      ) : (
                                        <span style={{
                                          fontSize:'13px',
                                          color:'#a16207',
                                          fontWeight:600
                                        }}>
                                          Por visualizar
                                        </span>
                                      )}
                                    </div>

                                    <div style={{
                                      marginTop:'16px',
                                      padding:'14px',
                                      borderRadius:'8px',
                                      background:'#f9fafb',
                                      display:'grid',
                                      gap:'10px'
                                    }}>
                                      {Object.entries(answers).map(([key, value]) => {
                                        const label = {
                                          pain:'Dor',
                                          fatigue:'Cansaço',
                                          breathlessness:'Falta de ar',
                                          mood:'Estado emocional',
                                          notes:'Observações',
                                          wellbeing:'Bem-estar',
                                          difficulties:'Dificuldades',
                                          needs:'Necessidades'
                                        }[key] || key;

                                        return (
                                          <div key={key}>
                                            <strong style={{fontSize:'13px'}}>{label}</strong>
                                            <p style={{
                                              margin:'4px 0 0',
                                              whiteSpace:'pre-wrap',
                                              overflowWrap:'anywhere',
                                              fontSize:'14px'
                                            }}>
                                              {formatAnswer(value)}
                                            </p>
                                          </div>
                                        );
                                      })}

                                      {!Object.keys(answers).length && (
                                        <p className="muted">Este registo não contém respostas.</p>
                                      )}
                                    </div>

                                    {alreadyViewed && (
                                      <p style={{
                                        color:'#15803d',
                                        fontSize:'12px',
                                        marginTop:'12px'
                                      }}>
                                        Visualizado em {formatDate(viewedEntries[item.id])}
                                      </p>
                                    )}

                                    {!alreadyViewed && (
                                      <button
                                        type="button"
                                        className="button"
                                        style={{marginTop:'14px'}}
                                        disabled={viewingBusy === item.id}
                                        onClick={() => markAsViewed(item.id)}
                                      >
                                        <Eye size={16}/>
                                        {viewingBusy === item.id
                                          ? 'A guardar...'
                                          : 'Marcar como visualizado'}
                                      </button>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="muted" style={{marginTop:'16px'}}>
                              Este doente ainda não tem registos submetidos.
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="content-card">
                      <h3><ClipboardList size={19}/> Notas de acompanhamento</h3>

                      <form onSubmit={saveProfessionalNote}>
                        <label>
                          Nota profissional
                          <textarea
                            rows="5"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            required
                            placeholder="Registe uma nota de acompanhamento…"
                          />
                        </label>

                        <button className="button" disabled={busy}>
                          Guardar nota
                        </button>
                      </form>
                    </div>
                  </>
                )}

                {profile.role !== 'professional' && (
                  <div className="content-card history">
                    <h3><CalendarDays size={19}/> Os meus registos recentes</h3>

                    {entries.length ? (
                      entries.map(item => (
                        <div className="history-row" key={item.id}>
                          <span>{formatDate(item.created_at)}</span>
                          <b>
                            {item.kind === 'patient'
                              ? 'Avaliação de bem-estar'
                              : 'Registo de cuidador'}
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="muted">Ainda não existem registos.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {message && <p className="feedback">{message}</p>}
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="brand">
          <span className="brand-mark"><Heart size={18}/></span>
          <span>PallBridge <b>360</b></span>
        </div>

        <p>Da pessoa à ação. Em todas as dimensões do cuidado.</p>

        <small>
          Plataforma de apoio à comunicação e continuidade dos cuidados.
          Não substitui avaliação clínica nem serviços de emergência.
        </small>
      </footer>
    </div>
  );
}

export default App;
