import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsInt, IsUrl } from 'class-validator';

export enum PostTypeEnum {
  ARTICLE = 'ARTICLE',
  CASE_STUDY = 'CASE_STUDY',
  MENU = 'MENU',
  GENERAL = 'GENERAL',
}

export class CreateScientificArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  authors: string;

  @IsString()
  @IsNotEmpty()
  journal: string;

  @IsInt()
  publicationYear: number;

  @IsString()
  @IsOptional()
  doi?: string;

  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsNotEmpty()
  abstract: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  clinicalTakeaways?: string[];
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(PostTypeEnum)
  @IsOptional()
  postType?: PostTypeEnum = PostTypeEnum.GENERAL;

  @IsString()
  @IsOptional()
  sharedPostId?: string;

  @IsOptional()
  articleData?: CreateScientificArticleDto;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class FeedQueryDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  filter?: 'ALL' | 'FOLLOWING' | 'ARTICLES' | 'CASES' = 'ALL';

  @IsString()
  @IsOptional()
  username?: string;
}
