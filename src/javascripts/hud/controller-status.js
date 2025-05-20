import * as THREE from 'three';

export class ControllerStatusHUD {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.left = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.padding = '10px';
        this.container.style.borderRadius = '5px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '14px';
        this.container.style.zIndex = '1000';
        
        this.leftControllerInfo = document.createElement('div');
        this.rightControllerInfo = document.createElement('div');
        
        this.container.appendChild(this.leftControllerInfo);
        this.container.appendChild(document.createElement('hr'));
        this.container.appendChild(this.rightControllerInfo);
        
        document.body.appendChild(this.container);
    }

    update(leftController, rightController) {
        if (leftController) {
            const leftRotation = leftController.rotation;
            const leftEuler = new THREE.Euler().setFromQuaternion(leftRotation);
            const leftDegrees = {
                x: THREE.MathUtils.radToDeg(leftEuler.x).toFixed(1),
                y: THREE.MathUtils.radToDeg(leftEuler.y).toFixed(1),
                z: THREE.MathUtils.radToDeg(leftEuler.z).toFixed(1)
            };
            
            this.leftControllerInfo.innerHTML = `
                <h3>Left Controller</h3>
                <p>X Rotation: ${leftDegrees.x}°</p>
                <p>Y Rotation: ${leftDegrees.y}°</p>
                <p>Z Rotation: ${leftDegrees.z}°</p>
            `;
        }

        if (rightController) {
            const rightRotation = rightController.rotation;
            const rightEuler = new THREE.Euler().setFromQuaternion(rightRotation);
            const rightDegrees = {
                x: THREE.MathUtils.radToDeg(rightEuler.x).toFixed(1),
                y: THREE.MathUtils.radToDeg(rightEuler.y).toFixed(1),
                z: THREE.MathUtils.radToDeg(rightEuler.z).toFixed(1)
            };
            
            this.rightControllerInfo.innerHTML = `
                <h3>Right Controller</h3>
                <p>X Rotation: ${rightDegrees.x}°</p>
                <p>Y Rotation: ${rightDegrees.y}°</p>
                <p>Z Rotation: ${rightDegrees.z}°</p>
            `;
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 