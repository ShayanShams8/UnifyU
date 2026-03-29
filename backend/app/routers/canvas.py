from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..security import get_current_student

router = APIRouter(prefix="/canvas", tags=["canvas"])


@router.get("", response_model=schemas.CanvasStateOut)
def get_canvas(
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    state = (
        db.query(models.CanvasState)
        .filter(models.CanvasState.student_id == current.id)
        .first()
    )
    if not state:
        return schemas.CanvasStateOut(nodes_json="[]", connections_json="[]", has_saved=False)
    return schemas.CanvasStateOut(
        nodes_json=state.nodes_json,
        connections_json=state.connections_json,
        has_saved=True,
    )


@router.put("")
def save_canvas(
    data: schemas.CanvasStateIn,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    state = (
        db.query(models.CanvasState)
        .filter(models.CanvasState.student_id == current.id)
        .first()
    )
    if state:
        state.nodes_json = data.nodes_json
        state.connections_json = data.connections_json
    else:
        state = models.CanvasState(
            student_id=current.id,
            nodes_json=data.nodes_json,
            connections_json=data.connections_json,
        )
        db.add(state)
    db.commit()
    return {"ok": True}
