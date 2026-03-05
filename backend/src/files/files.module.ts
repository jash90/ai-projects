import { Module } from '@nestjs/common';
import { ProjectFilesController } from './project-files.controller';
import { UploadedFilesController } from './uploaded-files.controller';
import { ProjectFilesService } from './project-files.service';
import { UploadedFilesService } from './uploaded-files.service';

@Module({
  controllers: [ProjectFilesController, UploadedFilesController],
  providers: [ProjectFilesService, UploadedFilesService],
  exports: [ProjectFilesService, UploadedFilesService],
})
export class FilesModule {}
