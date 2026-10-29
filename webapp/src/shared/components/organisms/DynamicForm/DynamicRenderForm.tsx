"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "../../atoms/Skeleton";
import { Spinner } from "../../atoms/Spinner";
import { FormSkeleton } from "./FormSkeleton";
import { GetFormByPath } from "@/shared/service/form.service";
import { Form } from "@/types/backend/form";
import { DynamicForm } from "./DynamicForm";
import { useHandleForm } from "@/shared/hooks/useHandlerForm";

import { FormErrorBoundary } from "./FormErrorBoundary";

interface DynamicRenderFormProps {
    path: string;
    cb: (param: any) => void;
    pathSend?: string;
}

export function DynamicRenderForm({ path, cb, pathSend }: DynamicRenderFormProps) {
    const { SendForm } = useHandleForm();
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Form | null>(null);

    useEffect(() => {
        let isMounted = true;
        const ex = async () => {
            setLoading(true);
            try {
                const response = await GetFormByPath({ path });
                if (isMounted) {
                    setForm(response);
                }
            } catch (error) {
                console.error("Error fetching form:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        ex();
        return () => {
            isMounted = false;
        };
    }, [path]);

    const callback = (data: any) => {
        cb(data);
    };

    const cleanAndTransformPayload = (payloadData: any, elements: any[]) => {
        const cleaned = { ...payloadData };
        
        const traverse = (els: any[]) => {
            els.forEach(el => {
                if ('elements' in el) {
                    traverse(el.elements);
                } else {
                    const name = el.name;
                    const val = cleaned[name];
                    
                    // 1. Eliminar campos vacíos (strings vacíos, null, undefined)
                    if (val === '' || val === undefined || val === null) {
                        delete cleaned[name];
                        return;
                    }
                    
                    // 2. Convertir campos numéricos a números
                    if (el.type === 'number' || el.controlType === 'number') {
                        const num = Number(val);
                        if (!isNaN(num)) {
                            cleaned[name] = num;
                        } else {
                            delete cleaned[name];
                        }
                    }
                }
            });
        };
        
        traverse(elements);
        return cleaned;
    };

    const HabdleSubmit = (data: any) => {
        if (form) {
            const cleanedData = cleanAndTransformPayload(data, form.inputs);
            SendForm({
                path: pathSend ? pathSend : form.action,
                method: form.method,
                data: cleanedData,
                formPath: path, // Pasamos el path del formulario para invalidación de caché
                cb: () => callback(cleanedData)
            });
        }
    };

    return (
        <div key={path} className="w-full">
            {loading ? (
                <FormSkeleton />
            ) : form ? (
                <FormErrorBoundary key={form.action || path}>
                    <DynamicForm onSubmit={HabdleSubmit} formData={form} />
                </FormErrorBoundary>
            ) : null}
        </div>
    );
}
