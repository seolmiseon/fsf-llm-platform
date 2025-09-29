import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { question } = await request.json();

        if (!question) {
            return NextResponse.json(
                { error: '질문이 필요합니다.' },
                { status: 400 }
            );
        }

        // Python 스크립트 경로 설정
        const pythonScriptPath = path.join(
            process.cwd(),
            '..',
            'python',
            'python_projects',
            '4_RagPractice',
            'football_rag.py'
        );

        // Python 가상환경 경로 (pyenv 사용)
        const pythonEnvPath = path.join(
            process.env.HOME || '',
            '.pyenv',
            'versions',
            'solar_RAG',
            'bin',
            'python'
        );

        return new Promise((resolve) => {
            // Python 스크립트 실행
            const pythonProcess = spawn(pythonEnvPath, [
                pythonScriptPath,
                '--question',
                question
            ]);

            let result = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                result += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const parsedResult = JSON.parse(result);
                        resolve(NextResponse.json(parsedResult));
                    } catch (parseError) {
                        resolve(NextResponse.json({ 
                            answer: result,
                            source: 'Python RAG System'
                        }));
                    }
                } else {
                    console.error('Python script error:', error);
                    resolve(NextResponse.json(
                        { error: 'RAG 시스템에서 오류가 발생했습니다.' },
                        { status: 500 }
                    ));
                }
            });

            pythonProcess.on('error', (err) => {
                console.error('Failed to start Python process:', err);
                resolve(NextResponse.json(
                    { error: 'Python 스크립트 실행에 실패했습니다.' },
                    { status: 500 }
                ));
            });
        });

    } catch (error) {
        console.error('RAG API Error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'RAG API가 정상적으로 작동 중입니다.',
        usage: 'POST 요청으로 질문을 보내주세요.',
        example: {
            question: '손흥민의 최근 활약은 어때?'
        }
    });
} 