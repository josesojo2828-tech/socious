import React, { useState, useEffect } from 'react';
import { Save, X, Calculator, AlertCircle, Info, Sparkles } from 'lucide-react';
import { useAnthropometry } from '../hooks/useAnthropometry';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';

interface PatientData {
  birthDate: string;
  gender: string;
}

interface Props {
  patientId: string;
  patient: PatientData;
  cb?: () => void;
  editId?: string;
}

export const AnthropometryForm = ({ patientId, patient, cb, editId }: Props) => {
  const { addMeasurement, updateMeasurement } = useAnthropometry(patientId);
  const { closeModal } = useModalStore();
  const { addToast } = useToastStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    sittingHeight: '',
    usualWeight: '',
    armSpan: '',
    // Pliegues
    tricipital: '',
    bicipital: '',
    subscapular: '',
    suprailiac: '',
    skinfoldSupraspinale: '',
    abdominal: '',
    thigh: '',
    calf: '',
    // Perímetros
    c_arm_relaxed: '',
    c_arm_flexed: '',
    c_wrist: '',
    c_chest: '',
    c_abdomen: '',
    c_calf: '',
    girthThighMid: '',
    waist: '',
    hip: '',
    // Diámetros
    diameterHumeral: '',
    diameterBiestiloid: '',
    diameterFemoral: '',
  });

  // Real-time Calculated State
  const [realTimeCalc, setRealTimeCalc] = useState<any>({});

  // Load measurement if editId is provided
  useEffect(() => {
    if (editId) {
      const loadMeasurement = async () => {
        try {
          const res = await apiClient.get(`/api/anthropometry/${editId}`);
          const data = res.data;
          const mapVal = (v: any) => (v === null || v === undefined || v === 0) ? '' : String(v);
          setFormData({
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            weight: mapVal(data.weight),
            height: mapVal(data.height),
            sittingHeight: mapVal(data.sittingHeight),
            usualWeight: mapVal(data.usualWeight),
            armSpan: mapVal(data.armSpan),
            tricipital: mapVal(data.tricipital),
            bicipital: mapVal(data.bicipital),
            subscapular: mapVal(data.subscapular),
            suprailiac: mapVal(data.suprailiac),
            skinfoldSupraspinale: mapVal(data.skinfoldSupraspinale),
            abdominal: mapVal(data.abdominal),
            thigh: mapVal(data.thigh),
            calf: mapVal(data.calf),
            c_arm_relaxed: mapVal(data.c_arm_relaxed),
            c_arm_flexed: mapVal(data.c_arm_flexed),
            c_wrist: mapVal(data.c_wrist),
            c_chest: mapVal(data.c_chest),
            c_abdomen: mapVal(data.c_abdomen),
            c_calf: mapVal(data.c_calf),
            girthThighMid: mapVal(data.girthThighMid),
            waist: mapVal(data.waist),
            hip: mapVal(data.hip),
            diameterHumeral: mapVal(data.diameterHumeral),
            diameterBiestiloid: mapVal(data.diameterBiestiloid),
            diameterFemoral: mapVal(data.diameterFemoral),
          });
        } catch (error) {
          console.error("Error cargando medición para editar:", error);
        }
      };
      loadMeasurement();
    }
  }, [editId]);

  // Calcular edad
  const age = (() => {
    if (!patient?.birthDate) return 20;
    const today = new Date();
    const birth = new Date(patient.birthDate);
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      a--;
    }
    return a;
  })();

  const gender = patient?.gender || 'MALE';

  // Live calculation effect
  useEffect(() => {
    const w = parseFloat(formData.weight) || 0;
    const h = parseFloat(formData.height) || 0;
    const sh = parseFloat(formData.sittingHeight) || 0;
    const as = parseFloat(formData.armSpan) || 0;

    const tr = parseFloat(formData.tricipital) || 0;
    const bi = parseFloat(formData.bicipital) || 0;
    const sub = parseFloat(formData.subscapular) || 0;
    const sup = parseFloat(formData.suprailiac) || 0;
    const suprasp = parseFloat(formData.skinfoldSupraspinale) || 0;
    const abd = parseFloat(formData.abdominal) || 0;
    const th = parseFloat(formData.thigh) || 0;
    const c_c = parseFloat(formData.calf) || 0;

    const arm_r = parseFloat(formData.c_arm_relaxed) || 0;
    const arm_f = parseFloat(formData.c_arm_flexed) || 0;
    const waist_c = parseFloat(formData.waist) || 0;
    const hip_c = parseFloat(formData.hip) || 0;
    const thigh_m = parseFloat(formData.girthThighMid) || 0;
    const calf_p = parseFloat(formData.c_calf) || 0;

    const dia_h = parseFloat(formData.diameterHumeral) || 0;
    const dia_b = parseFloat(formData.diameterBiestiloid) || 0;
    const dia_f = parseFloat(formData.diameterFemoral) || 0;

    if (h <= 0 || w <= 0) {
      setRealTimeCalc({});
      return;
    }

    const res: any = {};

    // 1. BMI
    const hM = h / 100;
    res.bmi = (w / (hM * hM)).toFixed(2);

    // 2. Masa Adiposa (Kerr)
    if (tr > 0 && sub > 0 && suprasp > 0 && abd > 0 && th > 0 && c_c > 0) {
      const sum6 = tr + sub + suprasp + abd + th + c_c;
      const zAdip = (sum6 * (170.18 / h) - 116.41) / 34.79;
      const adipMass = (zAdip * 5.85 + 25.6) / Math.pow(170.18 / h, 3);
      res.adiposeMass = Math.max(0, adipMass).toFixed(2);
      res.fatPercentage = ((adipMass / w) * 100).toFixed(2);
    }

    // 3. Masa Ósea (Rocha)
    if (dia_b > 0 && dia_f > 0) {
      const dBieM = dia_b / 100;
      const dFemM = dia_f / 100;
      const boneMass = 3.02 * Math.pow(Math.pow(hM, 2) * dBieM * dFemM * 400, 0.712);
      res.boneMass = Math.max(0, boneMass).toFixed(2);
    }

    // 4. Masa Muscular (Lee)
    if (arm_r > 0 && thigh_m > 0 && calf_p > 0 && tr > 0 && th > 0 && c_c > 0) {
      const sexVal = (gender === 'MALE' || gender === 'MASCULINO') ? 1 : 0;
      const cag = arm_r - Math.PI * (tr / 10);
      const ctg = thigh_m - Math.PI * (th / 10);
      const ccg = calf_p - Math.PI * (c_c / 10);

      const muscleMass = hM * (0.00744 * cag * cag + 0.00088 * ctg * ctg + 0.00441 * ccg * ccg) - 0.048 * age + 2.4 * sexVal + 7.8;
      res.muscleMass = Math.max(0, muscleMass).toFixed(2);
    }

    // 5. Masa Residual
    // Kerr/Rocha/Lee están calibrados en adultos: el server omite el residual
    // en menores de 18 y este preview debe hacer lo mismo (paridad).
    if (age >= 18 && res.adiposeMass !== undefined && res.boneMass !== undefined && res.muscleMass !== undefined) {
      // The three empirical estimates are independent, so their sum can exceed
      // the body weight; residual mass can never be negative (parity with the
      // server calculator, which clamps to [0, weight]).
      const residual = w - (parseFloat(res.adiposeMass) + parseFloat(res.boneMass) + parseFloat(res.muscleMass));
      res.residualMass = Math.max(0, residual).toFixed(2);
    }

    // 6. Somatotipo (Heath-Carter)
    if (tr > 0 && sub > 0 && suprasp > 0) {
      const sum3 = tr + sub + suprasp;
      const s3c = sum3 * (170.18 / h);
      const endo = -0.7182 + 0.1451 * s3c - 0.00068 * s3c * s3c + 0.0000014 * s3c * s3c * s3c;
      res.endomorphy = endo.toFixed(2);
    }

    if (dia_h > 0 && dia_f > 0 && arm_f > 0 && calf_p > 0) {
      const cagFlex = arm_f - (tr / 10);
      const ccgMeso = calf_p - (c_c / 10);
      const meso = 0.858 * dia_h + 0.601 * dia_f + 0.188 * cagFlex + 0.161 * ccgMeso - 0.131 * h + 4.5;
      res.mesomorphy = meso.toFixed(2);
    }

    const hwr = h / Math.cbrt(w);
    let ecto = 0.1;
    if (hwr >= 40.75) {
      ecto = 0.732 * hwr - 28.58;
    } else if (hwr > 38.25) {
      ecto = 0.463 * hwr - 17.63;
    }
    res.ectomorphy = ecto.toFixed(2);

    // Indices
    if (parseFloat(res.adiposeMass) > 0 && parseFloat(res.muscleMass) > 0) {
      res.adiposeMuscleIndex = (parseFloat(res.adiposeMass) / parseFloat(res.muscleMass)).toFixed(2);
    }
    if (parseFloat(res.muscleMass) > 0 && parseFloat(res.boneMass) > 0) {
      res.muscleBoneIndex = (parseFloat(res.muscleMass) / parseFloat(res.boneMass)).toFixed(2);
    }

    setRealTimeCalc(res);
  }, [formData, age, gender]);

  const handleCancel = () => {
    if (cb) {
      cb();
    } else {
      closeModal();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar fecha
    if (!formData.date) {
      newErrors.date = 'La fecha es requerida';
    }

    // Validar peso
    if (!formData.weight) {
      newErrors.weight = 'El peso es requerido';
    } else {
      const w = parseFloat(formData.weight);
      if (isNaN(w) || w <= 0) {
        newErrors.weight = 'Debe ser un número mayor a 0';
      }
    }

    // Validar estatura
    if (!formData.height) {
      newErrors.height = 'La estatura es requerida';
    } else {
      const h = parseFloat(formData.height);
      if (isNaN(h) || h <= 0) {
        newErrors.height = 'Debe ser un número mayor a 0';
      }
    }

    // Validar los demás campos numéricos opcionales (deben ser >= 0 si se completan)
    Object.keys(formData).forEach((key) => {
      if (key !== 'date' && key !== 'weight' && key !== 'height') {
        const val = (formData as any)[key];
        if (val !== '') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            newErrors[key] = 'Debe ser un número válido';
          } else if (num < 0) {
            newErrors[key] = 'No puede ser menor a 0';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error al escribir
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!validateForm()) {
      addToast({
        type: 'warning',
        message: 'Por favor, corregí los errores marcados en el formulario.',
        title: 'Formulario Inválido'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      Object.keys(formData).forEach((key) => {
        const val = (formData as any)[key];
        if (val !== '') {
          if (key === 'date') {
            payload[key] = val;
          } else {
            payload[key] = parseFloat(val);
          }
        }
      });

      const res = editId 
        ? await updateMeasurement(editId, payload)
        : await addMeasurement(payload);

      if (res.success) {
        addToast({
          type: 'success',
          message: editId ? "Medición corregida con éxito." : "Medición registrada correctamente.",
          title: 'Operación Exitosa'
        });
        // Cerrar el modal primero para dar feedback visual inmediato
        closeModal();
        // Navegación post-persistencia: esperar un tick para que el server confirme el commit
        // y el componente destino pueda fetchear la data fresca
        await new Promise(resolve => setTimeout(resolve, 300));
        if (cb) cb();
      } else {
        addToast({
          type: 'error',
          message: res.error || "Ocurrió un error inesperado al procesar los datos.",
          title: 'Error de Servidor'
        });
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        message: 'No pudimos comunicarnos con el servidor. Intentá de nuevo.',
        title: 'Error de Red'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
      {/* Columna Izquierda: Formulario e Ingresos */}
      <div className="flex-1 bg-base-100 rounded-xl border border-base-300 shadow-sm p-6 space-y-6">
        {/* Cabecera del Formulario */}
        <div className="flex justify-between items-start border-b border-base-300 pb-4">
          <div>
            <h2 className="text-xl font-bold text-base-content">
              {editId ? 'Editar Protocolo Cineantropométrico' : 'Registrar Protocolo Cineantropométrico'}
            </h2>
            <p className="text-xs text-base-content/70 mt-1 uppercase font-semibold tracking-wider">
              Paciente: {gender === 'MALE' ? 'Masculino' : 'Femenino'}, {age} años
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleCancel}
            className="p-1.5 hover:bg-base-200 rounded-full transition-colors text-base-content/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider border-b border-base-300 pb-2">
              1. Medidas Básicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Fecha de Medición</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.date 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                  required
                />
                {errors.date && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.date}</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Peso Corporal (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  placeholder="Ej: 75.5"
                  value={formData.weight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.weight 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                  required
                />
                {errors.weight && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.weight}</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Talla / Estatura (cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  name="height"
                  placeholder="Ej: 175"
                  value={formData.height}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.height 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                  required
                />
                {errors.height && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.height}</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Talla Sentado (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="sittingHeight"
                  placeholder="Ej: 90"
                  value={formData.sittingHeight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.sittingHeight 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                />
                {errors.sittingHeight && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.sittingHeight}</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Envergadura de Brazos (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="armSpan"
                  placeholder="Ej: 178"
                  value={formData.armSpan}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.armSpan 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                />
                {errors.armSpan && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.armSpan}</span>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-base-content/70 uppercase mb-1">Peso Habitual (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="usualWeight"
                  placeholder="Ej: 74.0"
                  value={formData.usualWeight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.usualWeight 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                  }`}
                />
                {errors.usualWeight && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.usualWeight}</span>}
              </div>
            </div>
          </div>

          {/* Section 2: Pliegues */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider border-b border-base-300 pb-2">
              2. Pliegues Cutáneos (mm)
            </h3>
            <div className="bg-base-200 text-base-content/80 p-3 rounded-lg flex items-start gap-2 text-xs border border-base-300">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>Ingresá los pliegues cutáneos en <strong>milímetros (mm)</strong>. Todos son requeridos para la Masa Adiposa (Kerr).</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'tricipital', label: 'Tríceps' },
                { name: 'bicipital', label: 'Bíceps' },
                { name: 'subscapular', label: 'Subescapular' },
                { name: 'suprailiac', label: 'Cresta Ilíaca' },
                { name: 'skinfoldSupraspinale', label: 'Supraespinal' },
                { name: 'abdominal', label: 'Abdominal' },
                { name: 'thigh', label: 'Muslo Anterior' },
                { name: 'calf', label: 'Pliegue Cutáneo Pierna Medial (Pantorrilla)' },
              ].map((item) => {
                const hasError = !!errors[item.name];
                return (
                  <div key={item.name}>
                    <label className="block text-xs font-bold text-base-content/70 mb-1">{item.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      name={item.name}
                      placeholder="mm"
                      value={(formData as any)[item.name]}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                        hasError 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                      }`}
                    />
                    {hasError && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors[item.name]}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Perímetros */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider border-b border-base-300 pb-2">
              3. Perímetros Corporales (cm)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'c_arm_relaxed', label: 'Brazo Relajado' },
                { name: 'c_arm_flexed', label: 'Brazo Flexionado/Contraído' },
                { name: 'girthThighMid', label: 'Muslo Medio' },
                { name: 'c_calf', label: 'Perímetro de Pierna (Pantorrilla)' },
                { name: 'waist', label: 'Cintura (mínima)' },
                { name: 'hip', label: 'Cadera (máxima)' },
                { name: 'c_wrist', label: 'Perímetro de Muñeca (Circunferencia)' },
                { name: 'c_chest', label: 'Tórax (Pecho)' },
                { name: 'c_abdomen', label: 'Abdomen' },
              ].map((item) => {
                const hasError = !!errors[item.name];
                return (
                  <div key={item.name}>
                    <label className="block text-xs font-bold text-base-content/70 mb-1">{item.label} (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      name={item.name}
                      placeholder="cm"
                      value={(formData as any)[item.name]}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                        hasError 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                      }`}
                    />
                    {hasError && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors[item.name]}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Diámetros */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider border-b border-base-300 pb-2">
              4. Diámetros Óseos (cm)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'diameterHumeral', label: 'Bicóndilo Húmero' },
                { name: 'diameterFemoral', label: 'Bicóndilo Fémur' },
                { name: 'diameterBiestiloid', label: 'Diámetro Biestiloideo (Muñeca)' },
              ].map((item) => {
                const hasError = !!errors[item.name];
                return (
                  <div key={item.name}>
                    <label className="block text-xs font-bold text-base-content/70 mb-1">{item.label} (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      name={item.name}
                      placeholder="cm"
                      value={(formData as any)[item.name]}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                        hasError 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-base-300 bg-base-100 text-base-content focus:ring-emerald-500'
                      }`}
                    />
                    {hasError && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors[item.name]}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acciones del Formulario */}
          <div className="pt-6 border-t border-base-300 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="btn border border-base-300 text-base-content bg-base-100 hover:bg-base-200 text-sm px-4 py-2 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.weight || !formData.height}
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : (
                <>
                  <Save size={16} /> {editId ? 'Guardar Cambios' : 'Registrar Medición'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Columna Derecha: Panel de Cálculos en Tiempo Real */}
      <div className="w-full lg:w-96 bg-slate-900 text-white p-6 rounded-xl shadow-sm lg:sticky lg:top-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-400">
              <Calculator size={18} />
              Vista Previa
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cálculos matemáticos en tiempo real</p>
          </div>

          {!realTimeCalc.bmi ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-3">
              <AlertCircle size={32} />
              <p className="text-xs">Ingresá el Peso y la Estatura del paciente para iniciar los cálculos automáticos.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Composición Corporal (Masa de 4 Componentes) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Fraccionamiento (4 Comp)</h4>
                
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Masa Adiposa (Kerr):</span>
                    <span className="font-bold text-emerald-300">
                      {realTimeCalc.adiposeMass ? `${realTimeCalc.adiposeMass} kg (${realTimeCalc.fatPercentage}%)` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Masa Muscular (Lee):</span>
                    <span className="font-bold text-blue-300">
                      {realTimeCalc.muscleMass ? `${realTimeCalc.muscleMass} kg` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Masa Ósea (Rocha):</span>
                    <span className="font-bold text-yellow-300">
                      {realTimeCalc.boneMass ? `${realTimeCalc.boneMass} kg` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Masa Residual:</span>
                    <span className="font-bold text-pink-300">
                      {realTimeCalc.residualMass ? `${realTimeCalc.residualMass} kg` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Somatotipo */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Somatotipo (Heath-Carter)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-rose-300 uppercase font-bold">Endo</div>
                    <div className="text-lg font-black text-rose-200 mt-0.5">{realTimeCalc.endomorphy || '-'}</div>
                  </div>
                  <div className="bg-sky-950/40 border border-sky-900/60 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-sky-300 uppercase font-bold">Meso</div>
                    <div className="text-lg font-black text-sky-200 mt-0.5">{realTimeCalc.mesomorphy || '-'}</div>
                  </div>
                  <div className="bg-amber-950/40 border border-amber-900/60 p-2.5 rounded-lg text-center">
                    <div className="text-[10px] text-amber-300 uppercase font-bold">Ecto</div>
                    <div className="text-lg font-black text-amber-200 mt-0.5">{realTimeCalc.ectomorphy || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Índices y Relaciones */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Índices Clínicos</h4>
                <div className="bg-slate-800/30 p-3 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Índice de Masa Corporal (IMC):</span>
                    <span className="font-bold">{realTimeCalc.bmi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Relación Adiposo/Muscular:</span>
                    <span className="font-bold">{realTimeCalc.adiposeMuscleIndex || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Relación Músculo/Ósea:</span>
                    <span className="font-bold">{realTimeCalc.muscleBoneIndex || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-4 mt-6 flex gap-2 items-center text-[10px] text-slate-500">
          <Info size={12} className="shrink-0" />
          <span>Fórmulas validadas conforme a estándares internacionales de composición corporal.</span>
        </div>
      </div>
    </div>
  );
};
