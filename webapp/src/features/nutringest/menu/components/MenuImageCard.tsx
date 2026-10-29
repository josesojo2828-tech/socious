'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/shared/components/atoms/Button';
import { MenuDetail } from '../types/menu.details';
import { useTranslation } from "@/context/i18n.context";
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { ImagePreviewModal } from '@/features/community/components/ImagePreviewModal';

interface MenuImageCardProps {
    menu: MenuDetail;
    onUpload: (file: File) => Promise<boolean>;
    onRemove: () => Promise<boolean>;
    canManage: boolean;
}

export const MenuImageCard = ({ menu, onUpload, onRemove, canManage }: MenuImageCardProps) => {
    const { t } = useTranslation();
    const { addToast } = useToastStore();
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const success = await onUpload(file);
        setUploading(false);
        e.target.value = "";

        if (success) {
            addToast({
                type: "success",
                title: t('dashboard.menu_image.uploaded_title'),
                message: t('dashboard.menu_image.uploaded_message'),
            });
        } else {
            addToast({
                type: "error",
                title: "Error",
                message: "No se pudo subir la imagen.",
            });
        }
    };

    const handleRemove = async () => {
        setRemoving(true);
        const success = await onRemove();
        setRemoving(false);

        if (success) {
            addToast({
                type: "success",
                title: t('dashboard.menu_image.removed_title'),
                message: t('dashboard.menu_image.removed_message'),
            });
        } else {
            addToast({
                type: "error",
                title: "Error",
                message: "No se pudo quitar la foto.",
            });
        }
    };

    return (
        <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">
                        <ImageIcon size={18} />
                    </span>
                    {t('dashboard.menu_image.title')}
                </h3>
            </div>

            {menu.imageUrl ? (
                <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="block w-full mb-4 cursor-zoom-in"
                    title={t('dashboard.menu_image.title')}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={menu.imageUrl}
                        alt={menu.name}
                        className="w-full max-h-72 object-cover rounded-lg border border-base-300"
                    />
                </button>
            ) : (
                <div className="mb-4 border-2 border-dashed border-base-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-base-content/50">
                    <Camera size={28} />
                    <p className="text-sm">{t('dashboard.menu_image.empty')}</p>
                </div>
            )}

            {canManage && (
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        loading={uploading}
                        onClick={() => inputRef.current?.click()}
                        className="gap-1.5"
                    >
                        <Upload size={16} />
                        {menu.imageUrl ? t('dashboard.menu_image.change_btn') : t('dashboard.menu_image.upload_btn')}
                    </Button>

                    {menu.imageUrl && (
                        <Button
                            variant="error"
                            size="sm"
                            outline
                            loading={removing}
                            onClick={handleRemove}
                            className="gap-1.5"
                        >
                            <Trash2 size={16} />
                            {t('dashboard.menu_image.remove_btn')}
                        </Button>
                    )}

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            )}

            <ImagePreviewModal
                src={previewOpen ? menu.imageUrl ?? null : null}
                alt={menu.name}
                title={menu.name}
                onClose={() => setPreviewOpen(false)}
            />
        </section>
    );
};
