// Form Kontrolleri
export const userFormControls = [
    {
        id: "userName",
        type: "text",
        placeholder: "Kullanıcı Adı",
        label: "Kullanıcı Adı",
        componentType: "input",
    },
    {
        id: "password",
        type: "password",
        placeholder: "Parola",
        label: "Parola",
        componentType: "input",
    },
    {
        id: "role",
        type: "select",
        placeholder: "Rol Seçin",
        label: "Rol",
        componentType: "select",
        options: [
            { value: "Admin", label: "Admin" },
            { value: "User", label: "Kullanıcı" },
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

// Tip Tanımları
export interface Errors {
    userName: string;
    password: string;
    role: string;
    success: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: string;
  }

// Başlangıç State Değerleri
export const initialErrors: Errors = {
    userName: '',
    password: '',
    role: '',
    success: '',
};

export const initialFormValues = {
    userName: '',
    password: '',
    role: 'User', // Varsayılan rol
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



export function getAlertClasses(alert: number) {
    let alertColorClass = "";
    let alertBgClass = "";
    let alertText = "";
    let alertRadio = "";
    let alertSlider = "";
    let alertHoverBg = "";

    switch (alert) {
        case 1:
            alertColorClass = "text-alert-red stroke-alert-red";
            alertBgClass = "bg-alert-red border-alert-red";
            alertRadio = "peer-checked:bg-alert-red border-alert-red";
            alertSlider = "accent-alert-red ring-alert-red";
            alertText = "Sertifikasız Cihaz";
            alertHoverBg = "bg-alert-red hover:bg-alert-red-hover"
            break;
        case 2:
            alertColorClass = "text-alert-green stroke-alert-green";
            alertBgClass = "bg-alert-green border-alert-green";
            alertRadio = "peer-checked:bg-alert-green border-alert-green";
            alertSlider = "accent-alert-green ring-alert-green";
            alertText = "Onaylı Cihaz";
            alertHoverBg = "bg-alert-green hover:bg-alert-green-hover"
            break;
        case 3:
            alertColorClass = "text-alert-yellow stroke-alert-yellow";
            alertBgClass = "bg-alert-yellow border-alert-yellow";
            alertRadio = "peer-checked:bg-alert-yellow border-alert-yellow";
            alertSlider = "accent-alert-yellow ring-alert-yellow";
            alertText = "Nesne Tespit Problemi";
            alertHoverBg = "bg-alert-yellow hover:bg-alert-yellow-hover"
            break;
        default:
            alertColorClass = "text-alert-neutral stroke-alert-neutral";
            alertBgClass = "bg-alert-dark border-alert-dark";
            alertRadio = "peer-checked:bg-alert-dark border-alert-dark";
            alertSlider = "accent-alert-dark ring-alert-dark";
            alertHoverBg = "bg-alert-dark hover:bg-black"
            alertText = " ";
    }

    return { alertColorClass, alertBgClass, alertText, alertRadio, alertSlider, alertHoverBg };
}
