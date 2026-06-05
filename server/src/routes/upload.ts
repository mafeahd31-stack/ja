import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { uploadImage, uploadImages, uploadVideo, uploadAudio, deleteFile } from '../utils/cloudinary';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
    };

    const allAllowed = [...allowedTypes.image, ...allowedTypes.video, ...allowedTypes.audio];

    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /api/upload/image - Upload a single image
router.post('/image', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'jaykom';
    const buffer = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${buffer}`;

    const result = await uploadImage(dataUri, folder);

    res.json(result);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/upload/images - Upload multiple images
router.post('/images', authenticate, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'jaykom';

    const dataUris = files.map((f) => {
      const buffer = f.buffer.toString('base64');
      return `data:${f.mimetype};base64,${buffer}`;
    });

    const results = await uploadImages(dataUris, folder);
    res.json(results);
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/upload/video - Upload a video
router.post('/video', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'jaykom/chat';
    const buffer = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${buffer}`;

    const result = await uploadVideo(dataUri, folder);
    res.json(result);
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// POST /api/upload/audio - Upload audio (voice message)
router.post('/audio', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const folder = (req.body.folder as string) || 'jaykom/chat';
    const buffer = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${buffer}`;

    const result = await uploadAudio(dataUri, folder);
    res.json(result);
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

// POST /api/upload/chat - Upload chat attachment (image/video/audio)
router.post('/chat', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const folder = 'jaykom/chat';
    const buffer = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${buffer}`;
    const mimetype = req.file.mimetype;

    let result;

    if (mimetype.startsWith('image/')) {
      result = await uploadImage(dataUri, folder);
    } else if (mimetype.startsWith('video/')) {
      result = await uploadVideo(dataUri, folder);
    } else if (mimetype.startsWith('audio/')) {
      result = await uploadAudio(dataUri, folder);
    } else {
      res.status(400).json({ error: 'Unsupported file type for chat' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Upload chat file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// DELETE /api/upload/:publicId - Delete a file
router.delete('/:publicId', authenticate, async (req: Request, res: Response) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;
    const success = await deleteFile(publicId);

    if (!success) {
      res.status(404).json({ error: 'File not found or already deleted' });
      return;
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
