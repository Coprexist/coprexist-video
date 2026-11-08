from manim import *

FONT = "Noto Sans CJK SC"
BLUE = "#6d8cff"
RED = "#ff6b6b"
GREEN = "#3ddc97"
DIM = "#3a3f55"


class QueueFlow(Scene):
    def construct(self):
        lane = Line(LEFT * 5.4, RIGHT * 5.4, stroke_width=3, color=DIM).shift(DOWN * 0.96)
        slots = VGroup(*[
            RoundedRectangle(width=1.4, height=0.86, corner_radius=0.14, stroke_width=2,
                             stroke_color=DIM, fill_color='#141929', fill_opacity=1
                             ).shift(RIGHT * (i * 1.62 - 2.43) + DOWN * 0.96)
            for i in range(4)
        ])
        self.play(Create(lane), FadeIn(slots), run_time=0.9)
        self.wait(0.2)

        def task(n, color):
            box = RoundedRectangle(width=1.2, height=0.66, corner_radius=0.12, stroke_width=2,
                                   stroke_color=color, fill_color=color, fill_opacity=0.2)
            label = Text(str(n), font=FONT, font_size=26, color="#e8ebff").move_to(box)
            return VGroup(box, label)

        tasks = VGroup()
        for i in range(4):
            t = task(i + 1, BLUE).move_to(slots[i])
            t.shift(LEFT * 6 - UP * 2.4)
            t.set_opacity(0)
            tasks.add(t)
            self.play(t.animate.set_opacity(1).move_to(slots[i]), run_time=0.55)
        self.wait(0.3)

        blocked = task(5, RED).move_to(slots[3])
        blocked.shift(RIGHT * 3.0)
        blocked.set_opacity(0)
        self.play(blocked.animate.set_opacity(1), run_time=0.4)
        self.wait(0.2)
        for _ in range(3):
            self.play(blocked.animate.shift(LEFT * 0.14), run_time=0.09)
            self.play(blocked.animate.shift(RIGHT * 0.14), run_time=0.09)

        green = task(1, GREEN).move_to(slots[0])
        self.play(Transform(tasks[0], green), run_time=0.35)
        self.play(tasks[0].animate.shift(RIGHT * 6).set_opacity(0), run_time=0.7)
        self.play(
            tasks[1].animate.move_to(slots[0]),
            tasks[2].animate.move_to(slots[1]),
            tasks[3].animate.move_to(slots[2]),
            blocked.animate.move_to(slots[3]),
            run_time=0.9,
        )
        self.wait(1.2)