import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';

export interface PhotoData {
  id: string;
  uri: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  photoType?: PhotoType;
}

export enum PhotoType {
  TREE_OVERVIEW = 'tree_overview',
  TRUNK_DETAIL = 'trunk_detail',
  CROWN_DETAIL = 'crown_detail',
  ROOT_DETAIL = 'root_detail',
  DEFECT_DETAIL = 'defect_detail',
  PEST_DISEASE = 'pest_disease',
  MEASUREMENT = 'measurement',
  CONTEXT = 'context',
  OTHER = 'other'
}

export interface CameraOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  includeBase64?: boolean;
  includeExif?: boolean;
  saveToPhotos?: boolean;
  mediaType?: MediaType;
}

export class CameraService {
  private static instance: CameraService;
  private photosDirectory: string;

  private constructor() {
    this.photosDirectory = `${RNFS.DocumentDirectoryPath}/TreeInspector/Photos`;
    this.initializePhotosDirectory();
  }

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  /**
   * Inicializa o diretório de fotos
   */
  private async initializePhotosDirectory(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.photosDirectory);
      if (!exists) {
        await RNFS.mkdir(this.photosDirectory);
        console.log('📁 Diretório de fotos criado:', this.photosDirectory);
      }
    } catch (error) {
      console.error('❌ Erro ao criar diretório de fotos:', error);
    }
  }

  /**
   * Solicita permissões de câmera
   */
  public async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        const cameraGranted = 
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === 
          PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted) {
          Alert.alert(
            'Permissão Necessária',
            'O TreeInspector precisa de acesso à câmera para capturar fotos das árvores.',
            [{ text: 'OK' }]
          );
          return false;
        }

        return true;
      }

      // iOS - permissões são solicitadas automaticamente
      return true;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão de câmera:', error);
      return false;
    }
  }

  /**
   * Captura foto usando a câmera
   */
  public async capturePhoto(
    options: CameraOptions = {},
    location?: { latitude: number; longitude: number }
  ): Promise<PhotoData> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Permissão de câmera negada');
    }

    const defaultOptions = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      includeBase64: false,
      includeExif: true,
      saveToPhotos: false,
      mediaType: 'photo' as MediaType,
      ...options,
    };

    return new Promise((resolve, reject) => {
      launchCamera(defaultOptions, async (response: ImagePickerResponse) => {
        try {
          if (response.didCancel) {
            reject(new Error('Captura cancelada pelo usuário'));
            return;
          }

          if (response.errorMessage) {
            reject(new Error(response.errorMessage));
            return;
          }

          if (!response.assets || response.assets.length === 0) {
            reject(new Error('Nenhuma foto capturada'));
            return;
          }

          const asset = response.assets[0];
          if (!asset.uri) {
            reject(new Error('URI da foto não disponível'));
            return;
          }

          const photoData = await this.processPhoto(asset, location);
          resolve(photoData);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Seleciona foto da galeria
   */
  public async selectFromGallery(
    options: CameraOptions = {},
    location?: { latitude: number; longitude: number }
  ): Promise<PhotoData> {
    const defaultOptions = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      includeBase64: false,
      includeExif: true,
      mediaType: 'photo' as MediaType,
      ...options,
    };

    return new Promise((resolve, reject) => {
      launchImageLibrary(defaultOptions, async (response: ImagePickerResponse) => {
        try {
          if (response.didCancel) {
            reject(new Error('Seleção cancelada pelo usuário'));
            return;
          }

          if (response.errorMessage) {
            reject(new Error(response.errorMessage));
            return;
          }

          if (!response.assets || response.assets.length === 0) {
            reject(new Error('Nenhuma foto selecionada'));
            return;
          }

          const asset = response.assets[0];
          if (!asset.uri) {
            reject(new Error('URI da foto não disponível'));
            return;
          }

          const photoData = await this.processPhoto(asset, location);
          resolve(photoData);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Processa a foto capturada/selecionada
   */
  private async processPhoto(
    asset: any,
    location?: { latitude: number; longitude: number }
  ): Promise<PhotoData> {
    try {
      const photoId = this.generatePhotoId();
      const originalFileName = asset.fileName || `photo_${photoId}.jpg`;
      const fileExtension = this.getFileExtension(originalFileName);
      const newFileName = `${photoId}.${fileExtension}`;
      const newFilePath = `${this.photosDirectory}/${newFileName}`;

      // Redimensionar e comprimir a imagem
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri,
        1920, // maxWidth
        1920, // maxHeight
        'JPEG',
        80, // quality
        0, // rotation
        newFilePath,
        false, // keepMeta
        {
          mode: 'contain',
          onlyScaleDown: true,
        }
      );

      // Obter informações do arquivo
      const fileStats = await RNFS.stat(resizedImage.uri);

      const photoData: PhotoData = {
        id: photoId,
        uri: resizedImage.uri,
        fileName: newFileName,
        fileSize: fileStats.size,
        width: resizedImage.width,
        height: resizedImage.height,
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      console.log('📸 Foto processada:', photoData);
      return photoData;
    } catch (error) {
      console.error('❌ Erro ao processar foto:', error);
      throw error;
    }
  }

  /**
   * Gera ID único para a foto
   */
  private generatePhotoId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém extensão do arquivo
   */
  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'jpg';
  }

  /**
   * Deleta uma foto
   */
  public async deletePhoto(photoPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(photoPath);
      if (exists) {
        await RNFS.unlink(photoPath);
        console.log('🗑️ Foto deletada:', photoPath);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar foto:', error);
      throw error;
    }
  }

  /**
   * Copia foto para diretório temporário para compartilhamento
   */
  public async copyPhotoForSharing(photoPath: string): Promise<string> {
    try {
      const fileName = photoPath.split('/').pop() || 'photo.jpg';
      const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      
      await RNFS.copyFile(photoPath, tempPath);
      return tempPath;
    } catch (error) {
      console.error('❌ Erro ao copiar foto:', error);
      throw error;
    }
  }

  /**
   * Obtém informações de uma foto
   */
  public async getPhotoInfo(photoPath: string): Promise<any> {
    try {
      const exists = await RNFS.exists(photoPath);
      if (!exists) {
        throw new Error('Foto não encontrada');
      }

      const stats = await RNFS.stat(photoPath);
      return {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime,
        ctime: stats.ctime,
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações da foto:', error);
      throw error;
    }
  }

  /**
   * Lista todas as fotos no diretório
   */
  public async listPhotos(): Promise<string[]> {
    try {
      const exists = await RNFS.exists(this.photosDirectory);
      if (!exists) {
        return [];
      }

      const files = await RNFS.readDir(this.photosDirectory);
      return files
        .filter(file => file.isFile() && this.isImageFile(file.name))
        .map(file => file.path);
    } catch (error) {
      console.error('❌ Erro ao listar fotos:', error);
      return [];
    }
  }

  /**
   * Verifica se o arquivo é uma imagem
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = this.getFileExtension(fileName);
    return imageExtensions.includes(extension);
  }

  /**
   * Calcula o tamanho total das fotos
   */
  public async getTotalPhotosSize(): Promise<number> {
    try {
      const photos = await this.listPhotos();
      let totalSize = 0;

      for (const photoPath of photos) {
        const stats = await RNFS.stat(photoPath);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      console.error('❌ Erro ao calcular tamanho das fotos:', error);
      return 0;
    }
  }

  /**
   * Limpa fotos antigas (mais de X dias)
   */
  public async cleanOldPhotos(daysOld: number = 30): Promise<number> {
    try {
      const photos = await this.listPhotos();
      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const photoPath of photos) {
        const stats = await RNFS.stat(photoPath);
        if (stats.mtime.getTime() < cutoffDate) {
          await this.deletePhoto(photoPath);
          deletedCount++;
        }
      }

      console.log(`🧹 ${deletedCount} fotos antigas removidas`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Erro ao limpar fotos antigas:', error);
      return 0;
    }
  }

  /**
   * Obtém o diretório de fotos
   */
  public getPhotosDirectory(): string {
    return this.photosDirectory;
  }
}

export default CameraService;