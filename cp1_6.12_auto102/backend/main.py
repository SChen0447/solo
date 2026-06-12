from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from faker import Faker

fake = Faker("zh_CN")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Position(BaseModel):
    page: str
    lineIndex: int


class Comment(BaseModel):
    id: str
    userId: int
    userName: str
    text: str
    timestamp: float


class Annotation(BaseModel):
    id: str
    userId: int
    bookId: str
    segmentText: str
    fullText: str
    timestamp: float
    likes: int
    position: Position
    comments: List[Comment] = []


class CreateAnnotationRequest(BaseModel):
    userId: int
    bookId: str
    segmentText: str
    fullText: str
    position: Position


class CreateCommentRequest(BaseModel):
    userId: int
    userName: str
    text: str


annotations_db: List[Annotation] = []


def generate_fake_annotations():
    user_colors = ["#FF7043", "#66BB6A", "#42A5F5", "#AB47BC", "#FFA726"]
    book_ids = ["book1", "book2", "book3"]

    for i in range(10):
        book_id = book_ids[i % 3]
        user_id = (i % 5) + 1
        annotation_id = str(uuid.uuid4())

        comments = []
        if i % 3 == 0:
            for j in range(2):
                comment_id = str(uuid.uuid4())
                comments.append(
                    Comment(
                        id=comment_id,
                        userId=(j + 1) % 5 + 1,
                        userName=fake.name(),
                        text=fake.sentence(nb_words=10),
                        timestamp=datetime.now().timestamp() * 1000 - (j * 3600000),
                    )
                )

        annotation = Annotation(
            id=annotation_id,
            userId=user_id,
            bookId=book_id,
            segmentText=fake.sentence(nb_words=8),
            fullText=fake.paragraph(nb_sentences=3),
            timestamp=datetime.now().timestamp() * 1000 - (i * 7200000),
            likes=fake.random_int(min=0, max=20),
            position=Position(page="left", lineIndex=(i % 8) + 1),
            comments=comments,
        )
        annotations_db.append(annotation)


generate_fake_annotations()


@app.get("/api/annotations")
async def get_annotations(bookId: Optional[str] = None):
    if bookId:
        filtered = [a for a in annotations_db if a.bookId == bookId]
        return {"data": filtered}
    return {"data": annotations_db}


@app.post("/api/annotations")
async def create_annotation(req: CreateAnnotationRequest):
    annotation_id = str(uuid.uuid4())
    new_annotation = Annotation(
        id=annotation_id,
        userId=req.userId,
        bookId=req.bookId,
        segmentText=req.segmentText,
        fullText=req.fullText,
        timestamp=datetime.now().timestamp() * 1000,
        likes=0,
        position=req.position,
        comments=[],
    )
    annotations_db.append(new_annotation)
    return new_annotation


@app.post("/api/annotations/{annotation_id}/like")
async def like_annotation(annotation_id: str):
    for annotation in annotations_db:
        if annotation.id == annotation_id:
            annotation.likes += 1
            return annotation
    raise HTTPException(status_code=404, detail="Annotation not found")


@app.post("/api/annotations/{annotation_id}/comments")
async def add_comment(annotation_id: str, req: CreateCommentRequest):
    for annotation in annotations_db:
        if annotation.id == annotation_id:
            comment_id = str(uuid.uuid4())
            new_comment = Comment(
                id=comment_id,
                userId=req.userId,
                userName=req.userName,
                text=req.text,
                timestamp=datetime.now().timestamp() * 1000,
            )
            annotation.comments.append(new_comment)
            return annotation
    raise HTTPException(status_code=404, detail="Annotation not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
