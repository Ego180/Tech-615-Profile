const input = document.getElementById('skill-input');
const addBttn = document.getElementById('addSkillBtn');
const list = document.getElementById('skills-list');

// Use saved skills if there are any, otherwise start from the ones in the HTML
const saved = localStorage.getItem('skills');
let skills = saved
    ? JSON.parse(saved)
    : [...list.querySelectorAll('li')].map(li => li.textContent.trim());

function save() {
    localStorage.setItem('skills', JSON.stringify(skills));
}

function render() {
    list.innerHTML = '';
    skills.forEach((skill, index) => {
        const li = document.createElement('li');
        li.textContent = skill;

        const btn = document.createElement('button');
        btn.className = 'remove-btn';
        btn.textContent = 'x';
        btn.dataset.index = index;

        li.appendChild(btn);
        list.appendChild(li);
    });
}

function addSkill() {
    const value = input.value.trim();
    if(!value) return;
    skills.push(value);
    input.value = '';
    save();
    render();
}

addBttn.addEventListener('click', addSkill);
input.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        addSkill();
    }
});

list.addEventListener('click', (e) => {
    if(e.target.classList.contains('remove-btn')) {
        const index = e.target.dataset.index;
        skills.splice(index, 1);
        save();
        render();
    }
});

render();
