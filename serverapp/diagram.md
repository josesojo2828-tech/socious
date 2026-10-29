erDiagram
    %% ==========================================
    %% MÓDULO 1: USUARIOS Y PERFILES (AUTH)
    %% ==========================================
    User {
        string id PK
        string email
        string role "ADMIN | NUTRITIONIST | PATIENT"
        string permitId FK
    }

    Nutritionist {
        string id PK
        string userId FK "Link a User"
        string licenseCode
    }

    Patient {
        string id PK
        string nutritionistId FK "Dueño del paciente"
        string userId FK "Login del paciente (Opcional)"
        string firstName
        string lastName
    }

    %% Relaciones de Usuario
    User ||--o| Nutritionist : "Tiene Perfil (1:1)"
    User ||--o| Patient : "Tiene Perfil (1:1)"
    Nutritionist ||--|{ Patient : "Gestiona (1:N)"

    %% ==========================================
    %% MÓDULO 2: CLÍNICA Y CONSULTA (CORE)
    %% ==========================================
    Consultation {
        string id PK
        date scheduledAt
        string status
        string anthropometryId FK
        string planId FK
    }

    Anamnesis {
        string id PK
        string patientId FK
        json familyHistory
        json personalHistory
    }

    Anthropometry {
        string id PK
        decimal weight
        decimal height
        decimal bmi
        decimal fatPercentage
    }

    LabResult {
        string id PK
        string fileUrl
        json data
    }

    Goal {
        string id PK
        string title
        boolean isAchieved
    }

    %% Relaciones Clínicas
    Patient ||--o| Anamnesis : "Tiene Expediente (1:1)"
    Patient ||--|{ Consultation : "Asiste"
    Nutritionist ||--|{ Consultation : "Realiza"
    
    Consultation ||--o| Anthropometry : "Genera Snapshot"
    Patient ||--|{ Anthropometry : "Historial Medidas"
    Patient ||--|{ LabResult : "Tiene Exámenes"
    Patient ||--|{ Goal : "Tiene Metas"

    %% ==========================================
    %% MÓDULO 3: PLAN NUTRICIONAL (INTERVENCIÓN)
    %% ==========================================
    NutritionalPlan {
        string id PK
        string status "DRAFT | ACTIVE"
        int kcalTarget
        text recommendations
    }

    AssignedMenu {
        string id PK
        string eatingMoment "Ej: Desayuno"
    }

    AssignedExchangeList {
        string id PK
        decimal portions "Ej: 2.5"
    }

    AssignedSupplement {
        string id PK
        string dose
    }

    %% Relaciones del Plan
    Consultation ||--o| NutritionalPlan : "Prescribe (1:1)"
    Patient ||--|{ NutritionalPlan : "Tiene Historial"
    
    NutritionalPlan ||--|{ AssignedMenu : "Incluye"
    NutritionalPlan ||--|{ AssignedExchangeList : "Incluye"
    NutritionalPlan ||--|{ AssignedSupplement : "Incluye"

    %% ==========================================
    %% MÓDULO 4: HERRAMIENTAS Y ALIMENTOS
    %% ==========================================
    Menu {
        string id PK
        string name
        decimal totalKcal
    }

    ExchangeList {
        string id PK
        string name
        int baseKcal
    }

    FoodItem {
        string id PK
        string name
        decimal calories
        decimal proteins
    }

    MenuItem {
        string id PK
        decimal quantity
    }

    ExchangeListItem {
        string id PK
        decimal amount
    }

    %% Relaciones de Herramientas
    Nutritionist ||--|{ Menu : "Crea (Biblioteca)"
    Nutritionist ||--|{ ExchangeList : "Crea (Biblioteca)"
    
    Menu ||--|{ MenuItem : "Contiene"
    MenuItem }|--|| FoodItem : "Usa"
    
    ExchangeList ||--|{ ExchangeListItem : "Agrupa"
    ExchangeListItem }|--|| FoodItem : "Referencia"

    %% Asignaciones (El Cruce Mágico)
    AssignedMenu }|--|| Menu : "Es una instancia de"
    AssignedExchangeList }|--|| ExchangeList : "Es una instancia de"