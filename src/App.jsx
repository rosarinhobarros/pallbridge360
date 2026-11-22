
import React, { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import {
  Heart, Users, Stethoscope, ArrowRight, ShieldCheck,
  Activity, ClipboardList, LogOut, Menu, X, Sparkles,
  CalendarDays, HandHeart, Copy, Link2
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
    label: 'Médico de família',
    icon: Stethoscope,
    intro: 'Acompanhe necessidades e coordene cuidados.'
  }
};

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

  // Verificar a sessão e encaminhar automaticamente para a área pessoal
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
          setPage('home');
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Carregar o perfil sempre que a sessão mudar
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
      .select('id, full_name, role, association_code')
      .eq('id', session.user.id)
      .single();

    if (error) {
      setMessage('Não foi possível carregar o perfil: ' + error.message);
      return;
    }

    setProfile(data);

    if (data) {
      loadEntries();
    }
  }

  async function loadEntries() {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error) {
      setEntries(data || []);
    }
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

  // Iniciar sessão e abrir diretamente a área pessoal
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

  // Associar médico ou cuidador ao doente através do código
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
                  <b>Doente</b><b>Cuidador</b><b>Médico de família</b>
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
                    <option value="professional">Médico de família</option>
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
                        Partilhe este código com o seu médico de família e com o seu cuidador
                        para que possam associar-se à sua conta.
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
                      <h3><Link2 size={19}/> Associar ao doente</h3>

                      <p>
                        Introduza o código de associação de 8 caracteres fornecido pelo doente.
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

                {/* ÁREA DO MÉDICO */}
                {profile.role === 'professional' && (
                  <>
                    <div className="notice">
                      <Stethoscope size={18}/>
                      Área de acompanhamento profissional.
                    </div>

                    <div className="content-card">
                      <h3><Link2 size={19}/> Associar doente</h3>

                      <p>
                        Introduza o código de associação de 8 caracteres fornecido pelo doente.
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

                      <p className="fine-print">
                        A consulta de processos clínicos requer permissões e fluxos de consentimento adicionais.
                      </p>
                    </div>
                  </>
                )}

                <div className="content-card history">
                  <h3><CalendarDays size={19}/> Os meus registos recentes</h3>

                  {entries.length ? (
                    entries.map(item => (
                      <div className="history-row" key={item.id}>
                        <span>
                          {new Date(item.created_at).toLocaleString('pt-PT')}
                        </span>
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
