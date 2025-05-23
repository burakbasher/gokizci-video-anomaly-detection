"app/lib/definitions.ts"

// Form Kontrolleri
export const userFormControls = [
    {
      id: 'userName',
      label: 'Kullanıcı Adı',
      type: 'text',
      componentType: 'input',
    },
    {
      id: 'email',
      label: 'E-posta',
      type: 'email',
      componentType: 'input',
    },
    {
      id: 'password',
      label: 'Parola',
      type: 'password',
      componentType: 'input',
    },
    {
      id: 'role',
      label: 'Rol',
      componentType: 'select',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'Kullanıcı' },
      ],
    },
  ];
  


export const passwordChangeFormControls = [
    {
        id: "passwordOld",
        type: "password",
        placeholder: "Eski Parola",
        label: "Eski Parola",
        componentType: "input",
    },
    {
        id: "passwordNew1",
        type: "password",
        placeholder: "Yeni Parola",
        label: "Yeni Parola",
        componentType: "input",
    },
    {
        id: "passwordNew2",
        type: "password",
        placeholder: "Yeni Parolayı Tekrar Giriniz",
        label: "Yeni Parolayı Tekrar Giriniz",
        componentType: "input",
    },
];

export interface Errors {
    userName: string;
    email: string;
    password: string;
    role: string;
    success: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: "admin" | "user";
    sms_notification: boolean;
    email_notification: boolean;
    last_password_change: string;  
    last_username_change: string;   
    last_email_change: string;      
    profile_completion: number;    
    created_at: string;             
  }
  

// Başlangıç State Değerleri
export const initialErrors: Errors = {
    userName: '',
    email: '',
    password: '',
    role: '',
    success: '',
};

export const initialFormValues = {
    userName: '',
    email: '',
    password: '',
    role: 'user',
};

export const initialPasswordChangeForm = {
    passwordOld: '',
    passwordNew1: '',
    passwordNew2: '',
    success: '',
};

export const initialPasswordErrors: ErrorsPassword = {
    passwordOld: '',
    passwordNew1: '',
    passwordNew2: '',
    success: ""
};

// Tip Tanımları
export interface ErrorsPassword {
    passwordOld: string,
    passwordNew1: string,
    passwordNew2: string,
    success: string,
}

export interface Device {
    id: string;
    name: string;
    source_id: string;
    type: 'drone' | 'ip_camera' | 'webcam';
    status: 'online' | 'offline' | 'error';
    last_seen: string;
    stream_url?: string;
    created_at: string;
    updated_at: string;
}

export interface TimelineMarker {
  time: number; // seconds
  label?: string;
}

export interface TimelineThumbnail {
  time: number; // seconds
  src: string;
}

export interface Bookmark {
  time: number;
  label: string;
}

export interface MonitoringPanelProps {
  devices: string[];
  selectedDevice: string;
  onDeviceSelect: (device: string) => void;
  anomalyRateEnabled: boolean;
  onToggleAnomalyRate: (enabled: boolean) => void;
  videoSourceId: string;
  videoDuration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  timelineMarkers: TimelineMarker[];
  timelineThumbnails: TimelineThumbnail[];
  bookmarks: Bookmark[];
  onBookmarkClick: (time: number) => void;
  mode: "live" | "replay";
  onModeChange: (mode: "live" | "replay") => void;
  replayStartTime?: string;
  fps?: number;
}