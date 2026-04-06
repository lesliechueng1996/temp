import { NotFoundException } from '@/interface/exception';
import { getFileStorage } from '../external/file-storage';
import { getFileRepository } from '../repository/file-repository';

export const uploadFile = async (file: File) => {
  const fileStorage = getFileStorage();
  return fileStorage.uploadFile(file);
};

export const getFileInfo = async (fileId: string) => {
  const fileRepository = getFileRepository();
  const fileInfo = await fileRepository.getById(fileId);
  if (!fileInfo) {
    throw new NotFoundException('File not found');
  }
  return fileInfo;
};

export const downloadFile = async (fileId: string) => {
  const fileStorage = getFileStorage();
  return fileStorage.downloadFile(fileId);
};
