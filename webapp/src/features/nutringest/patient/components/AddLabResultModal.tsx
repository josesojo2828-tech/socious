import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Save, Beaker, Calendar, Check, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslation } from "@/context/i18n.context";
import { apiClient } from "@/shared/api/api.client";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<boolean>;
}

// --- 1. CONFIGURACIÓN DE SUGERENCIAS (COMMON DATA) ---

const COMMON_PARAMS = [
    "Glucosa", "Hemoglobina Glicosilada (HbA1c)", "Insulina Basal",
    "Colesterol Total", "Colesterol HDL", "Colesterol LDL", "Triglicéridos",
    "Hemoglobina", "Hematocrito", "Leucocitos", "Plaquetas",
    "Creatinina", "Urea", "Ácido Úrico", "Bilirrubina Total",
    "TSH", "T4 Libre", "T3 Libre",
    "Vitamina D (25-OH)", "Vitamina B12", "Hierro Sérico", "Ferritina",
    "Sodio", "Potasio", "Calcio", "Magnesio"
];

const COMMON_UNITS = [
    "mg/dL", "g/dL", "%", "mm³", "u/L", "mUI/L", "ng/mL", "pg/mL", "mEq/L", "µg/dL", "UI/L"
];

// Mapa "Smart Fill": Si seleccionas X, te sugiero la unidad Y
const PARAM_DEFAULTS: Record<string, string> = {
    "Glucosa": "mg/dL",
    "Hemoglobina Glicosilada (HbA1c)": "%",
    "Insulina Basal": "µUI/mL",
    "Colesterol Total": "mg/dL",
    "Colesterol HDL": "mg/dL",
    "Colesterol LDL": "mg/dL",
    "Triglicéridos": "mg/dL",
    "Hemoglobina": "g/dL",
    "Hematocrito": "%",
    "Leucocitos": "mm³",
    "Plaquetas": "mm³",
    "Creatinina": "mg/dL",
    "Ácido Úrico": "mg/dL",
    "TSH": "mUI/L",
    "Vitamina D (25-OH)": "ng/mL",
    "Vitamina B12": "pg/mL",
    "Sodio": "mEq/L",
    "Potasio": "mEq/L"
};

// --- 2. COMPONENTE AUTOCOMPLETE REUTILIZABLE ---

const AutocompleteInput = ({ value, onChange, options, placeholder, className, autoFocus }: any) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filtramos las opciones según lo que el usuario escribe
    const filteredOptions = options.filter((opt: string) =>
        opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
    );

    // Manejo de clic fuera para cerrar el dropdown
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                placeholder={placeholder}
                className={className}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)} // Mostrar al hacer clic
                autoFocus={autoFocus}
                autoComplete="off" // Importante para que no salga el autocompletado del navegador encima
            />

            {/* Dropdown de Sugerencias */}
            {showSuggestions && filteredOptions.length > 0 && (
                <ul className="absolute z-50 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1 left-0 text-xs animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.map((opt: string) => (
                        <li
                            key={opt}
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-base-content/90 transition-colors flex items-center justify-between group"
                            onClick={() => {
                                onChange(opt); // Seleccionar valor
                                setShowSuggestions(false); // Cerrar
                            }}
                        >
                            <span>{opt}</span>
                            {/* Icono sutil de selección */}
                            <Check size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- 3. COMPONENTE PRINCIPAL (MODAL) ---

interface LabParameter {
    id: string;
    name: string;
    value: string;
    unit: string;
}

export const AddLabResultModal = ({ isOpen, onClose, onSubmit }: Props) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [fileUrl, setFileUrl] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado del Formulario
    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

    const [parameters, setParameters] = useState<LabParameter[]>([
        { id: '1', name: '', value: '', unit: '' }
    ]);

    // Gestión de Filas
    const addRow = () => {
        setParameters([...parameters, { id: crypto.randomUUID(), name: '', value: '', unit: '' }]);
    };

    const removeRow = (id: string) => {
        if (parameters.length === 1) {
            setParameters([{ id: crypto.randomUUID(), name: '', value: '', unit: '' }]);
            return;
        }
        setParameters(parameters.filter(p => p.id !== id));
    };

    const updateRow = (id: string, field: keyof LabParameter, value: string) => {
        setParameters(prevParams => prevParams.map(p => {
            if (p.id !== id) return p;

            const updatedParam = { ...p, [field]: value };

            // Lógica Smart Fill: Si cambia el nombre, buscamos si tiene unidad por defecto
            if (field === 'name' && PARAM_DEFAULTS[value]) {
                // Solo la ponemos si el campo de unidad está vacío o tiene la unidad por defecto anterior
                if (!p.unit || Object.values(PARAM_DEFAULTS).includes(p.unit)) {
                    updatedParam.unit = PARAM_DEFAULTS[value];
                }
            }

            return updatedParam;
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await apiClient.post("/api/portfolio/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data?.success && res.data?.url) {
                setFileUrl(res.data.url);
                setUploadingImage(false);
                return;
            }
        } catch (err) {
            console.warn("Subida a servidor falló, usando fallback Data URL:", err);
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setFileUrl(reader.result);
            }
            setUploadingImage(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convertir array a objeto JSON para guardar
        const structuredData: Record<string, any> = {};
        parameters.forEach(p => {
            if (p.name && p.value) {
                structuredData[p.name] = {
                    value: Number(p.value),
                    unit: p.unit
                };
            }
        });

        const hasParameters = Object.keys(structuredData).length > 0;
        const hasFile = Boolean(fileUrl);

        // Si no hay ni archivo ni parámetros ni un nombre explícito, requerir al menos uno
        if (!hasFile && !hasParameters && !examName.trim()) {
            alert('Por favor adjunta la foto/documento del examen o ingresa al menos un parámetro.');
            return;
        }

        // Si no ingresó nombre del examen pero subió un archivo o parámetros, asignamos un nombre descriptivo por defecto
        const finalExamName = examName.trim() || (hasFile ? 'Examen de Laboratorio' : 'Resultado de Laboratorio');
        const finalExamDate = examDate || new Date().toISOString().split('T')[0];

        setIsLoading(true);

        const success = await onSubmit({
            name: finalExamName,
            date: finalExamDate,
            fileUrl: fileUrl || undefined,
            data: structuredData,
        });

        setIsLoading(false);
        if (success) {
            setExamName('');
            setFileUrl('');
            setParameters([{ id: crypto.randomUUID(), name: '', value: '', unit: '' }]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Beaker size={18} />
                    </div>
                    {t('dashboard.modals.add_lab_result.title')}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-300 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Datos Generales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/60 uppercase">{t('dashboard.modals.add_lab_result.exam_name_label')}</label>
                            <AutocompleteInput
                                value={examName}
                                onChange={setExamName}
                                options={["Perfil Lipídico", "Hemograma Completo", "Perfil Hepático", "Perfil Tiroideo", "Química Sanguínea"]}
                                placeholder={t('dashboard.modals.add_lab_result.exam_placeholder')}
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl focus:border-blue-500 outline-none text-sm shadow-sm"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/60 uppercase">{t('dashboard.modals.add_lab_result.date_label')}</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                                <input
                                    type="date"
                                    required
                                    className="w-full pl-10 pr-3 py-2 bg-base-100 border border-base-300 rounded-xl focus:border-blue-500 outline-none text-sm shadow-sm"
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Adjuntar Imagen / Foto del Examen */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-base-content/60 uppercase flex items-center justify-between">
                            <span>Foto o Documento del Examen</span>
                            <span className="text-[10px] text-base-content/50 font-normal">Opcional (PNG, JPG, WEBP)</span>
                        </label>

                        {fileUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    {fileUrl.startsWith('data:image') || fileUrl.match(/\.(png|jpg|jpeg|webp)($|\?)/i) ? (
                                        <img src={fileUrl} alt="Vista previa del examen" className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-base-content truncate">Foto del examen cargada</p>
                                        <p className="text-[11px] text-emerald-600 font-medium">Lista para adjuntar al expediente</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFileUrl('')}
                                    className="p-1.5 rounded-lg text-base-content/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Quitar foto"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-base-300 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-base-content/50 cursor-pointer transition-all group"
                            >
                                {uploadingImage ? (
                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium py-1">
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Procesando foto...</span>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud size={24} className="group-hover:text-emerald-600 transition-colors" />
                                        <span className="text-xs font-medium text-base-content/70 group-hover:text-emerald-700">Haz clic para subir la foto del resultado de laboratorio</span>
                                    </>
                                )}
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-base-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-base-100 px-2 text-xs text-base-content/50 font-medium">{t('dashboard.modals.add_lab_result.sections_label')}</span>
                        </div>
                    </div>

                    {/* Tabla de Valores */}
                    <div className="space-y-3">
                        <div className="bg-base-200 rounded-xl border border-base-300 overflow-visible shadow-sm">
                            {/* overflow-visible es CRUCIAL para que el dropdown salga de la tabla */}
                            <table className="w-full text-sm text-left">
                                <thead className="bg-base-200/50 text-base-content/60 text-xs font-bold uppercase border-b border-base-300">
                                    <tr>
                                        <th className="px-4 py-2 w-5/12">{t('dashboard.modals.add_lab_result.col_param')}</th>
                                        <th className="px-4 py-2 w-3/12">{t('dashboard.modals.add_lab_result.col_value')}</th>
                                        <th className="px-4 py-2 w-3/12">{t('dashboard.modals.add_lab_result.col_unit')}</th>
                                        <th className="px-2 py-2 w-1/12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-base-100">
                                    {parameters.map((param, index) => (
                                        <tr key={param.id} className="group hover:bg-base-200/50 transition-colors">
                                            <td className="p-2">
                                                <AutocompleteInput
                                                    value={param.name}
                                                    onChange={(val: string) => updateRow(param.id, 'name', val)}
                                                    options={COMMON_PARAMS}
                                                    placeholder={t('dashboard.modals.add_lab_result.param_placeholder')}
                                                    className="w-full px-2 py-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none transition-colors placeholder-gray-300"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0"
                                                    className="w-full px-2 py-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-mono text-base-content placeholder-gray-300"
                                                    value={param.value}
                                                    onChange={(e) => updateRow(param.id, 'value', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <AutocompleteInput
                                                    value={param.unit}
                                                    onChange={(val: string) => updateRow(param.id, 'unit', val)}
                                                    options={COMMON_UNITS}
                                                    placeholder={t('dashboard.modals.add_lab_result.unit_placeholder')}
                                                    className="w-full px-2 py-1.5 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-base-content/60 text-xs placeholder-gray-300"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(param.id)}
                                                    className="p-1.5 rounded transition-colors text-base-content/40 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                                    title="Limpiar o eliminar fila"
                                                    tabIndex={-1}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={addRow}
                            className="w-full py-2 border-2 border-dashed border-base-300 text-base-content/60 rounded-xl hover:border-blue-300 hover:text-emerald-600 hover:bg-emerald-50/50 flex items-center justify-center gap-2 transition-all text-sm font-medium"
                        >
                            <Plus size={16} /> {t('dashboard.modals.add_lab_result.add_param')}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-200 bg-base-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-base-300 text-base-content/70 rounded-xl hover:bg-base-100 hover:border-gray-400 font-medium transition-colors"
                    >
                        {t('dashboard.modals.add_lab_result.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                        {isLoading ? t('dashboard.modals.add_lab_result.saving_btn') : <><Save size={18} /> {t('dashboard.modals.add_lab_result.save_btn')}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};