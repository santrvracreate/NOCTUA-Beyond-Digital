auth.users (nativa de Supabase)
└── id (uuid, PK)
└── email
└── encrypted_password
└── ... (resto de columnas internas de Auth)

perfiles
└── id uuid PK, FK -> auth.users(id)
└── rol text NOT NULL, default 'usuario', CHECK (admin | usuario)
└── created_at timestamptz default now()

clientes (datos de la cuenta registrada; nombre histórico de la tabla)
└── id uuid PK, FK -> auth.users(id)
└── nombre text NOT NULL
└── telefono text (WhatsApp del cliente)
└── created_at timestamptz default now()

categorias
└── id bigint PK (identity)
└── nombre text NOT NULL, UNIQUE

proyectos
└── id bigint PK (identity)
└── id_cliente uuid NOT NULL, FK -> clientes(id)
└── id_categoria bigint FK -> categorias(id), NULL permitido
└── nombre text NOT NULL
└── descripcion text
└── url_demo text (avance en vivo)
└── url_produccion text (sitio final)
└── visible_clientes boolean default false
└── estado text default 'en_progreso', CHECK (en_progreso | completado | cancelado)
└── created_at timestamptz default now()

solicitudes
└── id bigint PK (identity)
└── id_cliente uuid NOT NULL, FK -> clientes(id)
└── id_proyecto bigint FK -> proyectos(id), NULL permitido
└── detalle text NOT NULL
└── estado text default 'pendiente', CHECK (pendiente | aceptada | rechazada | convertida)
└── created_at timestamptz default now()
(+ CHECK: si estado='convertida', id_proyecto no puede ser null)

mensajes
└── id bigint PK (identity, automático)
└── id_usuario uuid NOT NULL, FK -> perfiles(id)
└── contenido text NOT NULL (1 a 2000 caracteres)
└── created_at timestamptz default now()

Supabase Auth genera automáticamente el UUID de cada cuenta. Los triggers crean `perfiles` y `clientes` con ese mismo ID. `proyectos`, `categorias`, `solicitudes` y `mensajes` generan su ID numérico automáticamente.
