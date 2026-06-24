-- AlterEnum
ALTER TYPE "InputType" ADD VALUE 'QUESTIONNAIRE';

-- AlterTable
ALTER TABLE "WaitlistSignup" ADD COLUMN     "answersJson" JSONB;
