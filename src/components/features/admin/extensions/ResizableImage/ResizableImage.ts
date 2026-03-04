import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageComponent from './ResizableImageComponent';

export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                renderHTML: attributes => {
                    if (!attributes.width) return {};
                    return {
                        width: attributes.width,
                    };
                },
            },
            height: {
                default: null,
                renderHTML: attributes => {
                    if (!attributes.height) return {};
                    return {
                        height: attributes.height,
                    };
                },
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },
});
